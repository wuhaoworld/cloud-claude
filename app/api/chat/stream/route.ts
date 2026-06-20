import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectSessions, chatMessages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// 全局权限请求暂存区（生产环境应使用 Redis 等持久化存储）
export const pendingPermissions = new Map<
  string,
  {
    resolve: (value: { behavior: "allow" | "deny" }) => void;
    toolName: string;
    input: Record<string, unknown>;
  }
>();

// 用于在 SSE 流中缓存本轮所有消息，流结束后批量写入 DB
interface PendingMessage {
  id: string;
  role: "user" | "assistant";
  type: string;
  content: string;
  toolCallJson?: string;
  sortOrder: number;
}

// GET /api/chat/stream — SSE 流式 AI 对话
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");
  const sessionId = searchParams.get("sessionId") || undefined;
  const prompt = searchParams.get("prompt");
  // 客户端传来的用户消息 ID（已在前端生成，方便前后端对应）
  const userMsgId = searchParams.get("userMsgId") || uuidv4();

  if (!projectId || !prompt) {
    return NextResponse.json(
      { error: "projectId and prompt are required" },
      { status: 400 }
    );
  }

  // 验证项目属于当前用户
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // 创建 SSE 流
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // stream closed
        }
      };

      // 本轮待持久化的消息队列
      const pendingMessages: PendingMessage[] = [];
      let sortCounter = 0;

      // 获取当前会话已有消息的最大 sortOrder，用于续写排序
      const getSortBase = async (sid: string): Promise<number> => {
        const rows = await db
          .select({ sortOrder: chatMessages.sortOrder })
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, sid))
          .orderBy(chatMessages.sortOrder);
        return rows.length > 0 ? rows[rows.length - 1].sortOrder + 1 : 0;
      };

      try {
        // 动态导入 SDK 避免打包问题
        const { query } = await import("@anthropic-ai/claude-agent-sdk");

        let newSessionId = sessionId;
        const isFirstMessage = !sessionId;
        let sortBase = 0;

        if (sessionId) {
          sortBase = await getSortBase(sessionId);
        }

        // 先把用户消息加入队列
        pendingMessages.push({
          id: userMsgId,
          role: "user",
          type: "text",
          content: prompt,
          sortOrder: sortBase + sortCounter++,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queryOptions: any = {
          cwd: project.path,
          permissionMode: "default",
          enableFileCheckpointing: true,
          canUseTool: async (
            toolName: string,
            input: Record<string, unknown>
          ) => {
            const requestId = uuidv4();
            send({ type: "permission_request", requestId, toolName, input });

            const result = await new Promise<{ behavior: "allow" | "deny" }>(
              (resolve) => {
                pendingPermissions.set(requestId, { resolve, toolName, input });
                setTimeout(() => {
                  if (pendingPermissions.has(requestId)) {
                    pendingPermissions.delete(requestId);
                    resolve({ behavior: "deny" });
                  }
                }, 5 * 60 * 1000);
              }
            );

            send({ type: "permission_resolved", requestId, behavior: result.behavior });
            return result;
          },
        };

        if (sessionId) {
          queryOptions.resume = sessionId;
        }

        // 追踪当前正在构建的 AI 文本消息（流式累积）
        let currentAiTextMsgId = uuidv4();
        let currentAiTextContent = "";
        let hasAiTextMsg = false;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for await (const message of query({ prompt, options: queryOptions }) as any) {
          const msgType = (message as { type: string }).type;

          if (msgType === "system" && (message as { subtype?: string }).subtype === "init") {
            const initMsg = message as { session_id?: string };
            if (initMsg.session_id) {
              newSessionId = initMsg.session_id;
              // 现在才能知道 sortBase（新会话从 0 开始）
              sortBase = 0;
              // 更新用户消息的 sortOrder（初始已是 0，不变）
              send({ type: "session_init", sessionId: newSessionId });
            }
          } else if (msgType === "assistant") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const content = (message as any).message?.content || [];

            for (const block of content) {
              if (block.type === "text" && block.text) {
                // 流式文本：累积到同一条消息
                if (!hasAiTextMsg) {
                  hasAiTextMsg = true;
                  currentAiTextMsgId = uuidv4();
                  currentAiTextContent = "";
                  // 先发送占位，让前端知道消息 ID
                  send({ type: "text_start", msgId: currentAiTextMsgId });
                }
                currentAiTextContent += block.text;
                send({ type: "text", content: block.text, msgId: currentAiTextMsgId });
              } else if (block.type === "thinking" && block.thinking) {
                // thinking 块：独立消息，不与文本合并
                if (hasAiTextMsg && currentAiTextContent) {
                  // 先把文本消息推入队列
                  pendingMessages.push({
                    id: currentAiTextMsgId,
                    role: "assistant",
                    type: "text",
                    content: currentAiTextContent,
                    sortOrder: sortBase + sortCounter++,
                  });
                  hasAiTextMsg = false;
                  currentAiTextContent = "";
                }
                const thinkingId = uuidv4();
                pendingMessages.push({
                  id: thinkingId,
                  role: "assistant",
                  type: "thinking",
                  content: block.thinking,
                  sortOrder: sortBase + sortCounter++,
                });
                send({ type: "thinking", content: block.thinking, msgId: thinkingId });
              } else if (block.type === "tool_use") {
                const toolMsgId = uuidv4();
                pendingMessages.push({
                  id: toolMsgId,
                  role: "assistant",
                  type: "tool_call",
                  content: "",
                  toolCallJson: JSON.stringify({
                    toolName: block.name,
                    input: block.input || {},
                    status: "done",
                  }),
                  sortOrder: sortBase + sortCounter++,
                });
                send({
                  type: "tool_call",
                  toolName: block.name,
                  toolUseId: block.id,
                  input: block.input,
                  msgId: toolMsgId,
                });
              }
            }

            // 如果这轮 assistant 消息包含文本，最终推入队列
            if (hasAiTextMsg && currentAiTextContent) {
              pendingMessages.push({
                id: currentAiTextMsgId,
                role: "assistant",
                type: "text",
                content: currentAiTextContent,
                sortOrder: sortBase + sortCounter++,
              });
              hasAiTextMsg = false;
              currentAiTextContent = "";
            }
          } else if (msgType === "tool_result") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toolMsg = message as any;
            send({
              type: "tool_result",
              toolUseId: toolMsg.tool_use_id,
              content: toolMsg.content,
            });
          } else if (msgType === "result") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resultMsg = message as any;
            const finalSessionId = resultMsg.session_id || newSessionId;
            const now = new Date();

            // 1. 确保会话记录存在
            if (finalSessionId && isFirstMessage) {
              const sessionTitle = prompt.slice(0, 50) + (prompt.length > 50 ? "..." : "");
              await db
                .insert(projectSessions)
                .values({
                  sessionId: finalSessionId,
                  projectId,
                  title: sessionTitle,
                  lastActiveAt: now,
                  createdAt: now,
                })
                .onConflictDoUpdate({
                  target: projectSessions.sessionId,
                  set: { lastActiveAt: now },
                });
            } else if (finalSessionId && !isFirstMessage) {
              await db
                .update(projectSessions)
                .set({ lastActiveAt: now })
                .where(eq(projectSessions.sessionId, finalSessionId));
            }

            // 2. 批量写入本轮所有消息到数据库
            if (finalSessionId && pendingMessages.length > 0) {
              await db.insert(chatMessages).values(
                pendingMessages.map((m) => ({
                  id: m.id,
                  sessionId: finalSessionId,
                  role: m.role,
                  type: m.type,
                  content: m.content,
                  toolCallJson: m.toolCallJson || null,
                  sortOrder: m.sortOrder,
                  createdAt: now,
                }))
              );
            }

            send({
              type: "done",
              sessionId: finalSessionId,
              costUsd: resultMsg.cost_usd,
              durationMs: resultMsg.duration_ms,
            });
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        send({ type: "error", message: errMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
