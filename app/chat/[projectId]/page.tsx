"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { PermissionDialog } from "@/components/chat/permission-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Loader2 } from "lucide-react";
import type { ChatMessage } from "@/store/app-store";

interface ChatPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectChatPage({ params }: ChatPageProps) {
  const { projectId } = use(params);
  return <ChatArea projectId={projectId} sessionId={undefined} />;
}

export function ChatArea({
  projectId,
  sessionId,
}: {
  projectId: string;
  sessionId?: string;
}) {
  const {
    projects,
    sessions,
    currentSessionId,
    messages,
    isStreaming,
    pendingPermission,
    addMessage,
    updateLastMessage,
    setMessages,
    setIsStreaming,
    setPendingPermission,
    setCurrentProject,
    setCurrentSession,
    clearMessages,
    addSession,
  } = useAppStore();

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentProject = projects.find((p) => p.id === projectId);
  const currentSession = (sessions[projectId] || []).find(
    (s) => s.sessionId === currentSessionId
  );

  // 标记是否已完成历史消息加载（防止重复加载）
  const loadedKeyRef = useRef<string>("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 切换会话/项目时初始化
  useEffect(() => {
    setCurrentProject(projectId);
    if (sessionId) setCurrentSession(sessionId);
  }, [projectId, sessionId, setCurrentProject, setCurrentSession]);

  // 从数据库加载历史消息
  useEffect(() => {
    const key = `${projectId}:${sessionId ?? "new"}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;

    if (!sessionId) {
      // 新会话，清空消息
      clearMessages();
      return;
    }

    setIsLoadingHistory(true);
    fetch(`/api/projects/${projectId}/sessions/${sessionId}/messages`)
      .then((res) => {
        if (!res.ok) throw new Error("加载失败");
        return res.json();
      })
      .then((rows: Array<{
        id: string;
        role: "user" | "assistant";
        type: string;
        content: string;
        toolCallJson: string | null;
        sortOrder: number;
        createdAt: number;
      }>) => {
        const restored: ChatMessage[] = rows.map((row) => ({
          id: row.id,
          role: row.role,
          type: row.type as ChatMessage["type"],
          content: row.content,
          toolCall: row.toolCallJson ? JSON.parse(row.toolCallJson) : undefined,
          isStreaming: false,
          timestamp: row.createdAt,
        }));
        setMessages(restored);
      })
      .catch(() => {
        toast.error("加载对话历史失败");
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  }, [projectId, sessionId, setMessages, clearMessages]);

  // 滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (prompt: string) => {
      if (isStreaming) return;

      // 生成用户消息 ID（同时传给服务端，用于 DB 写入时保持一致）
      const userMsgId = uuidv4();

      // 先乐观地添加用户消息到 UI
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: "user",
        type: "text",
        content: prompt,
        timestamp: Date.now(),
      };
      addMessage(userMsg);
      setIsStreaming(true);

      // 添加 AI 消息占位符（流式中实时更新）
      const aiTextMsgId = uuidv4();
      const aiMsg: ChatMessage = {
        id: aiTextMsgId,
        role: "assistant",
        type: "text",
        content: "",
        isStreaming: true,
        timestamp: Date.now(),
      };
      addMessage(aiMsg);

      const controller = new AbortController();
      abortRef.current = controller;

      const qs = new URLSearchParams({ projectId, prompt, userMsgId });
      if (sessionId) qs.set("sessionId", sessionId);

      try {
        const res = await fetch(`/api/chat/stream?${qs}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          toast.error("请求失败，请检查项目配置");
          setIsStreaming(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";
        let currentText = "";
        // 当前 AI 文本消息在 messages 数组中是最后一个，直接更新它
        let activeAiMsgId = aiTextMsgId;
        let aiMsgInitialized = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              switch (event.type) {
                case "session_init":
                  setCurrentSession(event.sessionId);
                  break;

                case "text_start":
                  // 服务端通知 AI 文本消息的真实 ID
                  activeAiMsgId = event.msgId;
                  aiMsgInitialized = true;
                  break;

                case "text":
                  currentText += event.content;
                  updateLastMessage(currentText, true);
                  break;

                case "thinking": {
                  const thinkMsg: ChatMessage = {
                    id: event.msgId || uuidv4(),
                    role: "assistant",
                    type: "thinking",
                    content: event.content,
                    timestamp: Date.now(),
                  };
                  // 在当前 AI 文本占位符之前插入
                  addMessage(thinkMsg);
                  break;
                }

                case "tool_call": {
                  const toolMsg: ChatMessage = {
                    id: event.msgId || uuidv4(),
                    role: "assistant",
                    type: "tool_call",
                    content: "",
                    toolCall: {
                      toolName: event.toolName,
                      input: event.input || {},
                      status: "done",
                    },
                    timestamp: Date.now(),
                  };
                  addMessage(toolMsg);
                  break;
                }

                case "permission_request":
                  setPendingPermission({
                    requestId: event.requestId,
                    toolName: event.toolName,
                    input: event.input || {},
                  });
                  break;

                case "permission_resolved":
                  setPendingPermission(null);
                  break;

                case "done": {
                  updateLastMessage(currentText, false);
                  // 新会话：加入侧边栏会话列表
                  if (event.sessionId && !sessionId) {
                    addSession({
                      sessionId: event.sessionId,
                      projectId,
                      title: prompt.slice(0, 50) + (prompt.length > 50 ? "..." : ""),
                      lastActiveAt: Date.now(),
                      createdAt: Date.now(),
                    });
                    // 更新 URL，使刷新后能恢复到此会话
                    window.history.replaceState(
                      null,
                      "",
                      `/chat/${projectId}/${event.sessionId}`
                    );
                    setCurrentSession(event.sessionId);
                    // 更新 loadedKeyRef，防止下次 effect 重新加载
                    loadedKeyRef.current = `${projectId}:${event.sessionId}`;
                  }
                  break;
                }

                case "error":
                  toast.error(event.message || "AI 响应出错");
                  updateLastMessage(currentText || "（发生错误）", false);
                  break;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("连接中断");
          updateLastMessage("（连接中断）", false);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [
      isStreaming,
      projectId,
      sessionId,
      addMessage,
      updateLastMessage,
      setIsStreaming,
      setPendingPermission,
      setCurrentSession,
      addSession,
    ]
  );

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    updateLastMessage(
      messages[messages.length - 1]?.content || "",
      false
    );
  };

  const handleApprove = async (requestId: string) => {
    try {
      await fetch("/api/chat/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "approve" }),
      });
      setPendingPermission(null);
    } catch {
      toast.error("审批请求失败");
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      await fetch("/api/chat/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "deny" }),
      });
      setPendingPermission(null);
    } catch {
      toast.error("拒绝请求失败");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <header className="flex items-center gap-2 px-6 py-3 border-b border-border/60 shrink-0">
        <span className="text-sm text-foreground truncate">
          {currentProject?.name || "未选择项目"}
        </span>
        {currentSession && (
          <>
            <span className="text-border text-xs">/</span>
            <span className="text-sm text-foreground truncate">
              {currentSession.title}
            </span>
          </>
        )}

        {(isStreaming || isLoadingHistory) && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {isLoadingHistory ? "加载对话历史..." : "AI 正在思考..."}
          </div>
        )}
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">正在加载对话历史...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                向 AI 发送消息开始对话
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="shrink-0 border-t border-border/60 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={handleSend}
            onStop={handleStop}
            disabled={!currentProject || isLoadingHistory}
          />
        </div>
      </div>

      {/* 权限审批弹窗 */}
      <PermissionDialog
        permission={pendingPermission}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />
    </div>
  );
}
