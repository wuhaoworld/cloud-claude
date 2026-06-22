import fs from "fs";
import os from "os";
import path from "path";

export function normalizeProjectPath(input: string): string {
  const trimmed = input.trim();
  const expanded = trimmed === "~" || trimmed.startsWith("~/")
    ? path.join(os.homedir(), trimmed.slice(2))
    : trimmed;

  return path.resolve(expanded);
}

export async function validateProjectDirectory(input: string): Promise<string> {
  const normalizedPath = normalizeProjectPath(input);
  let stats: fs.Stats;

  try {
    stats = await fs.promises.stat(normalizedPath);
  } catch {
    throw new Error("Path does not exist on the server");
  }

  if (!stats.isDirectory()) {
    throw new Error("Path must be a directory");
  }

  try {
    await fs.promises.access(normalizedPath, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    throw new Error("Path is not readable and writable by the server process");
  }

  return normalizedPath;
}
