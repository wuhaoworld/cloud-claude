"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { ToolCallCard } from "@/components/chat/tool-call-card";
import type { Message, TextBlock, ThinkingBlock } from "@/store/types";
import { code } from "@streamdown/code";
import { cjk } from "@streamdown/cjk";
import 'katex/dist/katex.min.css';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isStreaming = message.status === "streaming";

  if (message.role === "user") {
    const text = message.blocks.find((b): b is TextBlock => b.type === "text")?.text ?? "";
    return (
      <div className="flex mb-4 justify-end">
        <div className="max-w-[80%]">
          <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 bg-muted text-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    );
  }

  // assistant 消息：空 blocks 时显示加载动画
  if (message.blocks.length === 0 && isStreaming) {
    return (
      <div className="flex mb-4">
        <div className="flex-1 min-w-0">
          <span className="text-xs thinking-highlight">
            正在思考
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-4 gap-2">
      {message.blocks.map((block, i) => {
        const isLastBlock = i === message.blocks.length - 1;
        if (block.type === "thinking") {
          return (
            <ThinkingBlockView
              key={i}
              block={block}
              isStreaming={isStreaming && isLastBlock}
            />
          );
        }
        if (block.type === "tool_use") {
          return <ToolCallCard key={block.toolUseId} toolCall={block} />;
        }
        // text
        return (
          <TextBlockView
            key={i}
            block={block}
            isStreaming={isStreaming && isLastBlock}
          />
        );
      })}
    </div>
  );
}

// ---- TextBlockView ----

function TextBlockView({ block, isStreaming }: { block: TextBlock; isStreaming: boolean }) {
  return (
    <div className="flex-1 min-w-0">
      <Streamdown
        mode={isStreaming ? "streaming" : "static"}
        className="text-sm leading-relaxed text-foreground"
        plugins={{ code, cjk }}
        animated
        linkSafety={{ enabled: false }}
        controls={{ table: false }}
      >
        {block.text}
      </Streamdown>
    </div>
  );
}

// ---- ThinkingBlockView ----

function ThinkingBlockView({
  block,
  isStreaming,
}: {
  block: ThinkingBlock;
  isStreaming: boolean;
}) {
  const [expanded, setExpanded] = useState(isStreaming);
  const [prevStreaming, setPrevStreaming] = useState(isStreaming);

  // 开始流式时自动展开
  if (isStreaming !== prevStreaming) {
    setPrevStreaming(isStreaming);
    if (isStreaming) setExpanded(true);
  }

  // 流式结束 800ms 后自动折叠
  useEffect(() => {
    if (!isStreaming) {
      const t = setTimeout(() => setExpanded(false), 800);
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  // 计时器：记录流式开始时刻，每秒刷新 elapsed
  const startedAtRef = useRef<number>(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;
    if (startedAtRef.current === 0) startedAtRef.current = performance.now();
    const id = setInterval(() => {
      setElapsed(Math.round((performance.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isStreaming]);

  const hasContent = block.text.trim() !== "";

  // 思考时长：完成后用服务端记录值，流式时用本地 elapsed
  const durationSec = block.durationSeconds !== undefined
    ? Math.round(block.durationSeconds)
    : Math.max(1, elapsed);

  const label = isStreaming
    ? `思考中... ${durationSec} S`
    : `已思考 ${durationSec} 秒`;

  // 无内容时仅显示正在思考
  if (!hasContent) {
    return (
      <div className="flex mb-1">
        <span className="text-xs thinking-highlight font-medium">正在思考</span>
      </div>
    );
  }

  return (
    <div className="flex mb-1">
      <div className="flex-1 min-w-0">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className={cn("text-xs", isStreaming ? "thinking-highlight font-medium" : "")}>
            {label}
          </span>
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        {expanded && (
          <div className="ml-0.5 my-2 pl-2 border-l-2 border-muted-foreground/15">
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {block.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
