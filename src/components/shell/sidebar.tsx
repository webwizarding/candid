"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { NAV_GROUPS, SETTINGS_ITEM, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

const noopSubscribe = () => () => {};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-lg px-2 outline-none transition-[background-color,color] duration-150 max-lg:h-10",
        "focus-visible:ring-2 focus-visible:ring-brand/40",
        active ? "bg-selected text-fg" : "text-fg-2 hover-fine:bg-hover hover-fine:text-fg",
      )}
    >
      <Icon name={item.icon} className={active && item.icon === "nav-calendar" ? "text-brand" : undefined} />
      <span className="t-14 salt min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-7 items-center px-2">
      <span className="salt font-mono text-[12px] leading-none tracking-[-0.24px] text-section">{children}</span>
    </div>
  );
}

function ThemeRow() {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes only knows the stored theme after mount.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <label className="flex h-8 w-full max-lg:h-10 cursor-pointer items-center gap-2 overflow-hidden rounded-lg px-2 text-fg-2 transition-colors duration-150 hover-fine:bg-hover">
      <Icon name="moon" />
      <span className="t-14 salt min-w-0 flex-1">Dark mode</span>
      <Switch
        checked={dark}
        onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
        aria-label="Dark mode"
        className="mr-0"
      />
    </label>
  );
}

function AccountMenu() {
  const profile = useAppStore((s) => s.profile);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 overflow-hidden border-t border-hairline px-2 pt-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-brand-tint p-2">
            <span className="font-inter text-[14px] leading-none font-semibold tracking-[-0.21px] whitespace-nowrap text-brand">
              {profile.initials}
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden leading-none whitespace-nowrap">
            <span className="truncate text-[14px] tracking-[-0.21px] text-fg">{profile.name}</span>
            <span className="salt truncate text-[12px] tracking-[-0.12px] text-fg-2">{profile.email}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-[215px]">
        <DropdownMenuLabel className="t-12 text-fg-2">Signed in as {profile.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/personal-details">
            <UserIcon /> Personal details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => toast("Signed out", { description: "This is a demo — your data stays in this browser." })}
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Navigation + utilities, shared by the desktop sidebar and the mobile nav sheet. */
export function SidebarBody({ className }: { className?: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col justify-between gap-6 overflow-y-auto p-3 [scrollbar-width:none]", className)}>
      <nav aria-label="Primary" className="flex w-full flex-col gap-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex w-full flex-col gap-0.5">
            <SectionLabel>{group.label}</SectionLabel>
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
        ))}
      </nav>
      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full flex-col gap-0.5">
          <ThemeRow />
          <NavLink item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM.href)} />
        </div>
        <AccountMenu />
      </div>
    </div>
  );
}

/** Fixed 240px sidebar from the design; hidden below `lg`, where the nav sheet takes over. */
export function Sidebar() {
  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col overflow-hidden border-r border-hairline bg-app lg:flex">
      <SidebarBody />
    </aside>
  );
}
