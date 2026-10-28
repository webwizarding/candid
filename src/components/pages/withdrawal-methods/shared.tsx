import { CreditCardIcon, GlobeIcon, LandmarkIcon, WalletIcon, type LucideIcon } from "lucide-react";
import { addDays, daysInMonth, isWeekend } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { EventColor, Holiday, WithdrawalKind } from "@/lib/types";

export const KINDS: { kind: WithdrawalKind; label: string; hint: string; icon: LucideIcon; color: EventColor }[] = [
  { kind: "bank", label: "Bank account", hint: "2–3 days", icon: LandmarkIcon, color: "blue" },
  { kind: "paypal", label: "PayPal", hint: "Instant", icon: WalletIcon, color: "purple" },
  { kind: "wise", label: "Wise", hint: "Same day", icon: GlobeIcon, color: "green" },
  { kind: "card", label: "Debit card", hint: "30 min", icon: CreditCardIcon, color: "orange" },
];

export const KIND_META = Object.fromEntries(KINDS.map((k) => [k.kind, k])) as Record<WithdrawalKind, (typeof KINDS)[number]>;

export const PAYOUT_CURRENCIES = ["GBP", "USD", "EUR", "INR"] as const;

export function KindTile({ kind, className }: { kind: WithdrawalKind; className?: string }) {
  const { icon: KindIcon, color } = KIND_META[kind];
  return (
    <span
      aria-hidden
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", className)}
      style={{ background: `var(--category-${color}-tint)`, color: `var(--event-${color}-fg)` }}
    >
      <KindIcon className="size-4" strokeWidth={2} />
    </span>
  );
}

export const masked = (last4: string) => (last4 ? `•••• ${last4}` : "");

/** Last weekday of the month that isn't a public holiday. */
export function lastWorkingDay(monthKey: string, holidays: Holiday[]): string {
  const off = new Set(holidays.map((h) => h.date));
  let day = monthKey.slice(0, 8) + String(daysInMonth(monthKey)).padStart(2, "0");
  while (isWeekend(day) || off.has(day)) day = addDays(day, -1);
  return day;
}

/** Next payout on or after `today`. */
export function nextPayoutDate(today: string, holidays: Holiday[]): string {
  const thisMonth = lastWorkingDay(today, holidays);
  if (thisMonth >= today) return thisMonth;
  return lastWorkingDay(addDays(today.slice(0, 8) + "01", 32), holidays);
}
