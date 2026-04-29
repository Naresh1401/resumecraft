import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

export function maskApiKey(prefix: string) {
  return `${prefix}••••••••••••••••••••••••`;
}

export function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
}

export function scoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  return "Poor";
}
