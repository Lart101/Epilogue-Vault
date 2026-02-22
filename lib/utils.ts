/**
 * utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared utility functions used across the application.
 * `cn()` merges Tailwind class names using clsx + tailwind-merge.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
