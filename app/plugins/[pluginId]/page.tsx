import { ChevronLeft, PackageOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PluginGlyph } from "@/components/plugins/plugin-glyph";
import { getInstalledPlugin, getPluginSkills } from "@/lib/plugins";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PluginDetailPageProps = {
  params: Promise<{ pluginId: string }>;
};

export default async function PluginDetailPage({ params }: PluginDetailPageProps) {
  const { pluginId } = await params;
  const plugin = await getInstalledPlugin(decodeURIComponent(pluginId));

  if (!plugin) {
    notFound();
  }

  const skills = await getPluginSkills(plugin);

  return (
    <div className="flex min-h-full flex-col bg-white">
      <header className="border-b border-black/5 px-8 py-6">
        <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-6">
          <div className="min-w-0">
            <Link
              href="/plugins"
              className="mb-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              返回
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              <PluginGlyph name={plugin.name} />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-950">
                  {plugin.name}
                </h1>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-400">
                  {plugin.description}
                </p>
              </div>
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-black/10 bg-zinc-50 px-3 py-1 text-xs text-zinc-500">
            {skills.length} 个 Skills
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto w-full max-w-7xl">
          {skills.length > 0 ? (
            <div className="grid grid-cols-1 gap-y-7">
              {skills.map((skill) => (
                <article
                  key={skill.id}
                  className={cn(
                    "group grid grid-cols-[auto_1fr] gap-3.5 rounded-2xl p-2.5",
                    "transition-colors hover:bg-zinc-50"
                  )}
                >
                  <PluginGlyph name={skill.name} variant="skill" />
                  <div className="min-w-0 pt-0.5">
                    <h2 className="truncate text-sm font-semibold text-zinc-900">
                      {skill.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-400">
                      {skill.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/70 text-center">
              <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <PackageOpen className="size-5 text-zinc-400" />
              </div>
              <h2 className="text-base font-medium text-zinc-900">
                暂无 Skills
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                未从该插件的 skills 目录中读取到 Skill。
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
