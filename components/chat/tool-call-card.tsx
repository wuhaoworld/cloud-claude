"use client";

import { cn, formatDurationMs } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  SquareTerminal,
  Wrench,
  Search,
  Eye,
  FolderSearch,
  WandSparkles,
  PencilLine,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { ToolUseBlock } from "@/store/types";

interface ToolCallCardProps {
  toolCall: ToolUseBlock;
}

const TOOL_LABELS: Record<string, string> = {
  Bash: "终端",
  bash: "终端",
  Read: "读取文件",
  read: "读取文件",
  FileRead: "读取文件",
  Write: "写入文件",
  write: "写入文件",
  FileWrite: "写入文件",
  FileEdit: "编辑文件",
  Grep: "搜索内容",
  grep: "搜索内容",
  Glob: "文件匹配",
  glob: "文件匹配",
  WebFetch: "网页请求",
  webFetch: "网页请求",
};

function isSkillTool(toolName: string, input?: Record<string, unknown>) {
  return (
    toolName.toLowerCase().includes("skill") ||
    (input !== undefined && ("skill" in input || "Skills" in input))
  );
}

function renderToolIcon(toolName: string, input?: Record<string, unknown>) {
  const normalizedToolName = toolName.toLowerCase();
  const className = "size-3.5 text-muted-foreground shrink-0";

  if (isSkillTool(toolName, input)) return <WandSparkles className={className} />;
  if (normalizedToolName === "bash") return <SquareTerminal className={className} />;
  if (normalizedToolName === "webfetch") return <Globe className={className} />;
  if (normalizedToolName === "grep") return <Search className={className} />;
  if (normalizedToolName === "read" || normalizedToolName === "fileread") {
    return <Eye className={className} />;
  }
  if (normalizedToolName === "glob") return <FolderSearch className={className} />;
  if (
    normalizedToolName === "write" ||
    normalizedToolName === "filewrite" ||
    normalizedToolName === "fileedit"
  ) {
    return <PencilLine className={className} />;
  }

  return <Wrench className={className} />;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const skillName =
    typeof toolCall.input?.skill === "string"
      ? toolCall.input.skill
      : typeof toolCall.input?.Skills === "string"
        ? toolCall.input.Skills
        : undefined;
  const label = skillName || TOOL_LABELS[toolCall.toolName] || toolCall.toolName;

  const statusIcon =
    toolCall.status === "running" ? (
      <Loader2 className="size-3 animate-spin text-blue-500" />
    ) : toolCall.status === "done" ? (
      <CheckCircle className="size-3 text-emerald-500" />
    ) : (
      <XCircle className="size-3 text-red-500" />
    );

  const command = toolCall.input?.command as string | undefined;
  const filePath = toolCall.input?.file_path as string | undefined;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-muted/40 overflow-hidden text-xs",
        "transition-all duration-150"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/60 transition-colors"
      >
        {renderToolIcon(toolCall.toolName, toolCall.input)}
        <span
          className={cn(
            "font-medium transition-colors",
            toolCall.status === "running" ? "thinking-highlight" : "text-foreground"
          )}
        >
          {label}
        </span>

        {command && (
          <code className="text-muted-foreground font-mono truncate flex-1 text-left">
            {command.slice(0, 40)}
            {command.length > 40 ? "…" : ""}
          </code>
        )}
        {!command && filePath && (
          <code className="text-muted-foreground font-mono truncate flex-1 text-left">
            {filePath.split("/").slice(-2).join("/")}
          </code>
        )}

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {toolCall.durationMs !== undefined && (
            <span className="text-muted-foreground">
              {formatDurationMs(toolCall.durationMs)}
            </span>
          )}
          {statusIcon}
          {expanded ? (
            <ChevronDown className="size-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/60 px-3 py-2 space-y-2 overflow-hidden">
          <div>
            <p className="text-muted-foreground mb-1">输入参数</p>
            <pre className="text-foreground font-mono bg-background/60 rounded p-2 overflow-x-auto text-[11px] leading-relaxed max-w-full whitespace-pre-wrap break-all">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.output && (
            <div>
              <p className="text-muted-foreground mb-1">执行结果</p>
              <pre className="text-foreground font-mono bg-background/60 rounded p-2 overflow-x-auto text-[11px] leading-relaxed max-h-40 max-w-full whitespace-pre-wrap break-all">
                {toolCall.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
