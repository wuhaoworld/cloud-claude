// 统一消息 Block 模型
// 流式消息和历史消息共用同一套类型，MessageBubble 无需分支处理

export type TextBlock = {
  type: "text";
  text: string;
};

export type ThinkingBlock = {
  type: "thinking";
  text: string;
  durationSeconds?: number; // 流式时为 undefined，thinking_done 后写入
};

export type ToolUseBlock = {
  type: "tool_use";
  toolUseId: string;
  toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>;
  output?: string;
  isError?: boolean;
  status: "running" | "done" | "error";
  durationMs?: number;
};

export type Block = TextBlock | ThinkingBlock | ToolUseBlock;

export type MessageStatus = "streaming" | "done" | "error" | "interrupted";

export interface Message {
  id: string;
  role: "user" | "assistant";
  blocks: Block[];
  status: MessageStatus;
  createdAt: number;
}

// ---- SSE 事件协议 ----

export type StreamEvent =
  | { type: "session_init"; sessionId: string; cwd?: string }
  | { type: "text_delta"; msgId: string; delta: string }
  | { type: "thinking_delta"; msgId: string; delta: string }
  | { type: "thinking_done"; msgId: string; durationSeconds: number }
  | { type: "tool_start"; msgId: string; toolUseId: string; toolName: string; input: Record<string, unknown> }
  | { type: "tool_end"; msgId: string; toolUseId: string; output: string; isError: boolean; durationMs: number }
  | { type: "permission_request"; requestId: string; toolUseId: string; toolName: string; input: Record<string, unknown> }
  | { type: "permission_resolved"; requestId: string; behavior: "allow" | "deny" }
  | { type: "done"; sessionId: string; costUsd?: number; durationMs?: number }
  | { type: "error"; message: string };
