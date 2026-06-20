"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  FolderOpen,
  Folder,
  MessageSquare,
  Plus,
  Loader2,
  MoreHorizontal,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/store/app-store";
import type { Project, ProjectSession } from "@/store/app-store";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ProjectTreeProps {
  onNewSession?: (projectId: string) => void;
}

export function ProjectTree({ onNewSession }: ProjectTreeProps) {
  const router = useRouter();
  const {
    projects,
    sessions,
    expandedProjects,
    currentProjectId,
    currentSessionId,
    setProjects,
    setSessions,
    removeProject,
    toggleProjectExpanded,
    setCurrentProject,
    setCurrentSession,
    clearMessages,
  } = useAppStore();

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) return;
      const data = await res.json();
      setProjects(data);
    } catch {
      /* ignore */
    }
  }, [setProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 加载项目的会话列表
  const loadSessions = useCallback(
    async (projectId: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/sessions`);
        if (!res.ok) return;
        const data = await res.json();
        setSessions(projectId, data);
      } catch {
        /* ignore */
      }
    },
    [setSessions]
  );

  const handleToggleProject = async (project: Project) => {
    toggleProjectExpanded(project.id);
    // 展开时加载会话
    if (!expandedProjects.has(project.id)) {
      await loadSessions(project.id);
    }
  };

  const handleSelectSession = (project: Project, session: ProjectSession) => {
    setCurrentProject(project.id);
    setCurrentSession(session.sessionId);
    clearMessages();
    router.push(`/chat/${project.id}/${session.sessionId}`);
  };

  const handleNewSession = (project: Project) => {
    setCurrentProject(project.id);
    setCurrentSession(null);
    clearMessages();
    router.push(`/chat/${project.id}`);
    onNewSession?.(project.id);
  };

  const handleDeleteProject = async (projectId: string, name: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("删除失败");
        return;
      }
      removeProject(projectId);
      toast.success(`项目 "${name}" 已删除`);
      if (currentProjectId === projectId) {
        router.push("/chat");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  if (projects.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-muted-foreground">暂无项目</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          点击上方"+"新建项目
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 py-1">
      {projects.map((project) => {
        const isExpanded = expandedProjects.has(project.id);
        const isActive = currentProjectId === project.id;
        const projectSessions = sessions[project.id] || [];

        return (
          <div key={project.id}>
            {/* 项目行 */}
            <div
              className={cn(
                "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer",
                "hover:bg-accent/60 transition-colors",
                isActive && !currentSessionId && "bg-accent"
              )}
            >
              {/* 展开箭头 */}
              <button
                className="shrink-0 p-0.5 rounded hover:bg-accent"
                onClick={() => handleToggleProject(project)}
                aria-label={isExpanded ? "折叠" : "展开"}
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform duration-150",
                    isExpanded && "rotate-90"
                  )}
                />
              </button>

              {/* 文件夹图标 + 名称 */}
              <button
                className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                onClick={() => handleNewSession(project)}
              >
                {isExpanded ? (
                  <FolderOpen className="size-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Folder className="size-3.5 text-amber-500 shrink-0" />
                )}
                <span className="text-sm font-medium truncate leading-none">
                  {project.name}
                </span>
              </button>

              {/* 操作菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity">
                    <MoreHorizontal className="size-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => handleNewSession(project)}
                    className="gap-2"
                  >
                    <Plus className="size-3.5" />
                    新建对话
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Pencil className="size-3.5" />
                    编辑项目
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleDeleteProject(project.id, project.name)
                    }
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    删除项目
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 会话列表（展开后显示） */}
            {isExpanded && (
              <div className="ml-5 border-l border-border/50 pl-1.5 space-y-0.5 py-0.5">
                {projectSessions.length === 0 ? (
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground">暂无对话</p>
                  </div>
                ) : (
                  projectSessions.map((sess) => {
                    const isSessionActive = currentSessionId === sess.sessionId;
                    return (
                      <button
                        key={sess.sessionId}
                        onClick={() => handleSelectSession(project, sess)}
                        className={cn(
                          "w-full flex items-start gap-1.5 px-2 py-1.5 rounded-md text-left",
                          "hover:bg-accent/60 transition-colors",
                          isSessionActive && "bg-accent"
                        )}
                      >
                        <MessageSquare className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate leading-tight">
                            {sess.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(sess.lastActiveAt), {
                              addSuffix: true,
                              locale: zhCN,
                            })}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
