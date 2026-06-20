"use client";

import { AlertTriangle, Terminal, Check, X, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PermissionRequest } from "@/store/app-store";

interface PermissionDialogProps {
  permission: PermissionRequest | null;
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
}

const DANGEROUS_PATTERNS = [
  /rm\s+-rf/,
  /sudo/,
  /chmod\s+777/,
  />\s*\/dev\//,
  /dd\s+if=/,
];

function isDangerous(input: Record<string, unknown>): boolean {
  const command = String(input.command || "");
  return DANGEROUS_PATTERNS.some((p) => p.test(command));
}

export function PermissionDialog({
  permission,
  onApprove,
  onDeny,
}: PermissionDialogProps) {
  if (!permission) return null;

  const dangerous = isDangerous(permission.input);

  return (
    <AlertDialog open={!!permission}>
      <AlertDialogContent
        className={cn(
          "max-w-md",
          dangerous && "border-red-500/50 shadow-red-500/10 shadow-xl"
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {dangerous ? (
              <AlertTriangle className="size-5 text-red-500" />
            ) : (
              <Shield className="size-5 text-amber-500" />
            )}
            <span className={dangerous ? "text-red-600" : ""}>
              {dangerous ? "高危操作确认" : "工具权限请求"}
            </span>
            <Badge
              variant={dangerous ? "destructive" : "secondary"}
              className="ml-auto text-xs"
            >
              {permission.toolName}
            </Badge>
          </AlertDialogTitle>
          <AlertDialogDescription>
            AI Agent 请求执行以下操作，请确认是否允许：
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 命令详情 */}
        <div className="my-2 space-y-3">
          {/* 工具类型 */}
          <div className="flex items-center gap-2">
            <Terminal className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">工具：</span>
            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
              {permission.toolName}
            </code>
          </div>

          {/* 参数详情 */}
          <div
            className={cn(
              "rounded-lg p-3 font-mono text-xs",
              dangerous
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-muted/60 border border-border/60 text-foreground"
            )}
          >
            <pre className="whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(permission.input, null, 2)}
            </pre>
          </div>

          {dangerous && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="size-3.5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                检测到高危命令！此操作可能对系统造成不可逆损害，请谨慎确认。
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onDeny(permission.requestId)}
            className="gap-2"
            id="permission-deny-btn"
          >
            <X className="size-3.5" />
            拒绝
          </Button>
          <Button
            onClick={() => onApprove(permission.requestId)}
            className={cn(
              "gap-2",
              dangerous &&
                "bg-red-600 hover:bg-red-700 text-white border-red-600"
            )}
            id="permission-approve-btn"
          >
            <Check className="size-3.5" />
            {dangerous ? "确认执行（有风险）" : "批准"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
