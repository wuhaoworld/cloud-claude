import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

interface ModelOption {
  name: string;
  id: string;
}

export async function GET() {
  try {
    const settingsPath = join(homedir(), ".claude", "settings.json");
    const raw = await readFile(settingsPath, "utf-8");
    const settings = JSON.parse(raw);
    const env = settings.env ?? {};

    const models: ModelOption[] = [];

    const pairs: [string, string][] = [
      ["ANTHROPIC_DEFAULT_SONNET_MODEL_NAME", "ANTHROPIC_DEFAULT_SONNET_MODEL"],
      ["ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME", "ANTHROPIC_DEFAULT_HAIKU_MODEL"],
      ["ANTHROPIC_DEFAULT_OPUS_MODEL_NAME", "ANTHROPIC_DEFAULT_OPUS_MODEL"],
    ];

    for (const [nameKey, idKey] of pairs) {
      const name = env[nameKey];
      const id = env[idKey];
      if (name && id) {
        models.push({ name, id });
      }
    }

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] });
  }
}
