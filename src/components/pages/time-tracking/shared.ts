import type { EventColor, TimeEntry } from "@/lib/types";

/** Validated two-series palette (brand + cyan, ΔE ≥ 10 under CVD in both themes). */
export const BILLABLE_COLOR = "var(--brand)";
export const NON_BILLABLE_COLOR = "#1f9cb8";

const PROJECT_COLORS: EventColor[] = ["purple", "blue", "green", "orange", "pink", "cyan"];

/** Stable color per project name so a project keeps its dot everywhere. */
export function projectColor(name: string): EventColor {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}

export function sumMinutes(entries: TimeEntry[]) {
  let total = 0;
  let billable = 0;
  for (const e of entries) {
    total += e.minutes;
    if (e.billable) billable += e.minutes;
  }
  return { total, billable, nonBillable: total - billable };
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h && !m) return "0h";
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

/** 01:02:03 */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
