import { isWeekend, rangeKeys } from "./dates";
import type { AppState, EventColor, Holiday, LeaveType } from "./types";

export const LEAVE_TYPES: LeaveType[] = ["Time off", "Sick", "Extra leave", "Half-day leave", "Personal"];

export const LEAVE_COLORS: Record<LeaveType, EventColor> = {
  "Time off": "green",
  Sick: "blue",
  "Extra leave": "pink",
  "Half-day leave": "green",
  Personal: "orange",
};

export const WORKDAY_MINUTES = 8 * 60;

/** Working days between two dates, skipping weekends and public holidays. */
export function workingDays(from: string, to: string, holidays: Holiday[]): string[] {
  const off = new Set(holidays.map((h) => h.date));
  return rangeKeys(from, to).filter((d) => !isWeekend(d) && !off.has(d));
}

export function durationLabel(days: number, hours: number): string {
  const parts: string[] = [];
  if (days) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  return parts.join(" ") || "0 hours";
}

export function formatDays(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function plural(n: number, one: string, many: string) {
  return `${formatDays(n)} ${n === 1 ? one : many}`;
}

export type LeaveStats = {
  available: number;
  pendingCount: number;
  pendingDays: number;
  upcoming: number;
  taken: number;
  contract: number;
  carryover: number;
  holidays: number;
};

export function computeLeaveStats(
  s: Pick<AppState, "requests" | "settings" | "holidays">,
  today: string,
): LeaveStats {
  const year = today.slice(0, 4);
  const thisYear = s.requests.filter((r) => r.from.slice(0, 4) === year);
  const approved = thisYear.filter((r) => r.status === "approved");
  const pending = thisYear.filter((r) => r.status === "pending");
  const used = approved.reduce((a, r) => a + r.days, 0);
  const pendingDays = pending.reduce((a, r) => a + r.days, 0);
  const upcoming = approved.filter((r) => r.from >= today).reduce((a, r) => a + r.days, 0);
  const total = s.settings.contractDays + s.settings.carryoverDays;
  return {
    available: Math.max(0, total - used - pendingDays),
    pendingCount: pending.length,
    pendingDays,
    upcoming,
    taken: used - upcoming,
    contract: s.settings.contractDays,
    carryover: s.settings.carryoverDays,
    holidays: s.holidays.filter((h) => h.date.slice(0, 4) === year).length,
  };
}
