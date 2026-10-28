import { ArmchairIcon, DumbbellIcon, GraduationCapIcon, HeartPulseIcon, PiggyBankIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Benefit, EventColor } from "@/lib/types";

export type BenefitCategory = Benefit["category"];

export const CATEGORIES: BenefitCategory[] = ["Health", "Wellness", "Learning", "Financial", "Lifestyle"];

const CATEGORY_STYLE: Record<BenefitCategory, { color: EventColor; icon: LucideIcon }> = {
  Health: { color: "green", icon: HeartPulseIcon },
  Wellness: { color: "pink", icon: DumbbellIcon },
  Learning: { color: "blue", icon: GraduationCapIcon },
  Financial: { color: "orange", icon: PiggyBankIcon },
  Lifestyle: { color: "purple", icon: ArmchairIcon },
};

/** Benefits carry no currency in the store; the employee is UK-based. */
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const moneyExact = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function formatMoney(amount: number, exact = false): string {
  return (exact && amount % 1 !== 0 ? moneyExact : money).format(amount);
}

export function CategoryTile({ category, size = "md" }: { category: BenefitCategory; size?: "sm" | "md" }) {
  const { color, icon: CategoryIcon } = CATEGORY_STYLE[category];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "md" ? "size-9 rounded-lg" : "size-5 rounded-[6px]",
      )}
      style={{ background: `var(--category-${color}-tint)`, color: `var(--event-${color}-fg)` }}
    >
      <CategoryIcon className={size === "md" ? "size-4" : "size-3"} strokeWidth={2} />
    </span>
  );
}
