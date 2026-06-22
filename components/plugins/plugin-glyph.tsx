import { Box, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";

type PluginGlyphProps = {
  name: string;
  variant?: "plugin" | "skill";
};

export function PluginGlyph({ name, variant = "plugin" }: PluginGlyphProps) {
  const hue = Array.from(name).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  ) % 360;
  const Icon = variant === "skill" ? Sparkles : Box;

  return (
    <div
      className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 shadow-sm ring-1 ring-black/5"
      style={
        {
          "--plugin-hue": hue,
          "--plugin-hue-alt": (hue + 95) % 360,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,hsl(var(--plugin-hue)_95%_78%/.55),transparent_42%),radial-gradient(circle_at_80%_75%,hsl(var(--plugin-hue-alt)_92%_72%/.45),transparent_45%)]" />
      <div className="relative grid size-6 place-items-center rounded-lg bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-sm">
        <Icon className="size-4 text-zinc-700" strokeWidth={2.2} />
      </div>
    </div>
  );
}
