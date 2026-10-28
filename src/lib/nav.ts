import type { IconName } from "@/components/icon";

export type NavItem = { href: string; label: string; icon: IconName; shortcut?: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "nav-dashboard" },
      { href: "/analytics", label: "Analytics", icon: "nav-analytics" },
    ],
  },
  {
    label: "Personal",
    items: [
      { href: "/personal-details", label: "Personal details", icon: "nav-personal" },
      { href: "/documents", label: "Documents", icon: "nav-documents" },
      { href: "/time-off", label: "Time off", icon: "nav-calendar" },
      { href: "/time-tracking", label: "Time tracking", icon: "nav-time-tracking" },
      { href: "/benefits", label: "Benefits", icon: "nav-benefits" },
    ],
  },
  {
    label: "Payments",
    items: [
      { href: "/invoice", label: "Invoice", icon: "nav-invoice" },
      { href: "/withdrawal-methods", label: "Withdrawal methods", icon: "nav-withdrawal" },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: "settings" };

export const ALL_PAGES: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];

export function pageTitle(pathname: string): string {
  const match = ALL_PAGES.find((p) => pathname === p.href || pathname.startsWith(p.href + "/"));
  return match?.label ?? "Time off";
}
