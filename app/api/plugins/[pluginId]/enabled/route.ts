import { NextRequest, NextResponse } from "next/server";
import { getInstalledPlugin, setPluginEnabled } from "@/lib/plugins";

type PluginEnabledRouteProps = {
  params: Promise<{ pluginId: string }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: PluginEnabledRouteProps
) {
  const { pluginId } = await params;
  const id = decodeURIComponent(pluginId);
  const plugin = await getInstalledPlugin(id);

  if (!plugin) {
    return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    enabled?: unknown;
  } | null;

  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json(
      { error: "enabled must be a boolean" },
      { status: 400 }
    );
  }

  await setPluginEnabled(id, body.enabled);

  return NextResponse.json({ id, enabled: body.enabled });
}
