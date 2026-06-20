"use client";

import { Sparkles, FolderPlus, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";

export default function ChatPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex-1 flex items-center justify-center h-full bg-background">
      <div className="text-center max-w-md px-4">
        {/* 图标 */}
        <div className="flex justify-center mb-6">
          <div
            className={cn(
              "size-16 rounded-2xl",
              "bg-gradient-to-br from-blue-500 to-indigo-600",
              "flex items-center justify-center",
              "shadow-xl shadow-blue-500/20"
            )}
          >
            <Sparkles className="size-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          欢迎使用 Cloud Claude
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          一个智能的 AI 编程助手。创建或选择一个项目，
          <br />
          开始与 AI 进行深度编程对话。
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-3 items-center">
          <Button
            size="lg"
            className={cn(
              "gap-2 px-6 rounded-xl",
              "bg-gradient-to-br from-blue-500 to-indigo-600",
              "hover:from-blue-600 hover:to-indigo-700",
              "shadow-lg shadow-blue-500/20"
            )}
            onClick={() => setCreateOpen(true)}
            id="welcome-new-project-btn"
          >
            <FolderPlus className="size-4" />
            新建项目
          </Button>

          <p className="text-xs text-muted-foreground">
            或从左侧项目列表中选择一个已有项目
          </p>
        </div>

        {/* 功能亮点 */}
        <div className="mt-10 grid grid-cols-2 gap-3 text-left">
          {[
            { title: "流式对话", desc: "实时流式输出，感受 AI 思考" },
            { title: "代码调试", desc: "AI 自动运行并修复代码错误" },
            { title: "文件操作", desc: "直接读写项目文件，一键应用" },
            { title: "版本控制", desc: "Git 集成，随时回滚 AI 修改" },
          ].map((item) => (
            <div
              key={item.title}
              className={cn(
                "p-3 rounded-xl border border-border/60",
                "bg-muted/30 hover:bg-muted/60 transition-colors"
              )}
            >
              <p className="text-xs font-semibold mb-0.5">{item.title}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
