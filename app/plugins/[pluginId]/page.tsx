import { ChevronLeft, Code2, ExternalLink, PackageOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PluginGlyph } from "@/components/plugins/plugin-glyph";
import { getInstalledPlugin, getPluginSkills } from "@/lib/plugins";

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
  const links = [
    plugin.homepage
      ? {
          href: plugin.homepage,
          icon: ExternalLink,
          label: "网站",
        }
      : null,
    plugin.repository
      ? {
          href: plugin.repository,
          icon: Code2,
          label: "代码仓库",
        }
      : null,
  ].filter((link) => link !== null);

  return (
    <div className="flex min-h-full flex-col overflow-y-auto bg-white">
      <header className="bg-[linear-gradient(180deg,#fafafa_0%,#fff_76%)] px-8 py-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-5">
            <Link
              href="/plugins"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              返回
            </Link>
          </div>

          <div className="grid gap-6 rounded-3xl border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(24,24,27,0.06)] md:grid-cols-[auto_1fr]">
            <PluginGlyph name={plugin.displayName} />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                  {plugin.displayName}
                </h1>
                {plugin.version !== "unknown" ? (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                    v{plugin.version}
                  </span>
                ) : null}
              </div>

              {plugin.displayName !== plugin.name ? (
                <p className="mt-1 text-sm text-zinc-400">{plugin.name}</p>
              ) : null}

              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
                {plugin.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {plugin.author ? (
                  <div className="text-zinc-500">
                    <span className="text-zinc-400">作者</span>
                    <span className="ml-2 font-medium text-zinc-800">
                      {plugin.author}
                    </span>
                  </div>
                ) : null}

                {links.map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-zinc-700 transition-colors hover:text-zinc-950"
                  >
                    <Icon className="size-4" />
                    {label}
                  </a>
                ))}

                {links.length === 0 && !plugin.author ? (
                  <span className="text-zinc-400">暂无作者与链接信息</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-8 py-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-zinc-950">Skills</h2>
              <div className="shrink-0 rounded-full border border-black/10 bg-white px-2.5 py-0.5 text-xs text-zinc-500">
                {skills.length} 个
              </div>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              当前插件提供的工作流与能力。
            </p>
          </div>
          {skills.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {skills.map((skill) => (
                <article
                  key={skill.id}
                  className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-[0_10px_30px_rgba(24,24,27,0.04)]"
                >
                  <h3 className="text-sm font-semibold leading-5 text-zinc-950">
                    {skill.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                    {skill.description}
                  </p>
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
