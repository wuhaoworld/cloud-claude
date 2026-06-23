"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface PluginEnabledSwitchProps {
  pluginId: string;
  enabled: boolean;
}

export function PluginEnabledSwitch({
  pluginId,
  enabled,
}: PluginEnabledSwitchProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  function handleCheckedChange(nextChecked: boolean) {
    const previousChecked = checked;
    setChecked(nextChecked);

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/plugins/${encodeURIComponent(pluginId)}/enabled`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ enabled: nextChecked }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update plugin status");
        }

        toast.success(nextChecked ? "插件已启用" : "插件已禁用");
        router.refresh();
      } catch {
        setChecked(previousChecked);
        toast.error("插件状态更新失败");
      }
    });
  }

  return (
    <Switch
      aria-label={checked ? "禁用插件" : "启用插件"}
      checked={checked}
      disabled={isPending}
      onCheckedChange={handleCheckedChange}
    />
  );
}
