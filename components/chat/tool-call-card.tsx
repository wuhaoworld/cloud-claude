"use client";

import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  Search,
  Edit,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { ToolUseBlock } from "@/store/types";

interface ToolCallCardProps {
  toolCall: ToolUseBlock;
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  Bash: Terminal,
  FileRead: FileText,
  FileWrite: Edit,
  FileEdit: Edit,
  Grep: Search,
  Glob: Search,
};

const TOOL_LABELS: Record<string, string> = {
  Bash: "终端",
  FileRead: "读取文件",
  FileWrite: "写入文件",
  FileEdit: "编辑文件",
  Grep: "搜索内容",
  Glob: "文件匹配",
};

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[toolCall.toolName] || Terminal;
  const label = TOOL_LABELS[toolCall.toolName] || toolCall.toolName;

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
        <Icon className="size-3.5 text-muted-foreground shrink-0" />
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
            <span className="text-muted-foreground">{toolCall.durationMs}ms</span>
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
