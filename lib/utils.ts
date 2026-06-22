import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDurationMs(durationMs: number) {
  if (durationMs > 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`
  }

  return `${durationMs}ms`
}
