"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  FileText,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  List,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useStudentStore } from "@/stores/student-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { openOverlay } from "@/stores/overlay-store";
import { useStorageStatus } from "@/lib/local-storage";
import { addMonths, fromKey, monthGrid, monthName } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useToday } from "@/hooks/use-today";
import { useIsMobile } from "@/hooks/use-media-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CourseDialog } from "./course-dialog";
import { GlobalDialogs } from "@/components/dialogs/global-dialogs";
import { GlobalSearch } from "@/components/shell/global-search";
import { KeyboardShortcuts } from "@/components/shell/keyboard-shortcuts";
import { FocusMonitor } from "./focus-page";
import { Reminders } from "./reminders";

const NAV = [
  { href: "/", label: "Calendar", icon: CalendarDays },
  { href: "/agenda", label: "Agenda", icon: List },
  { href: "/assignments", label: "Assignments", icon: CheckSquare },
  { href: "/focus", label: "Focus timer", icon: Clock3 },
  { href: "/clubs", label: "Clubs", icon: Users },
  { href: "/scheduling", label: "Scheduling", icon: CalendarCheck },
  { href: "/notes", label: "Notes", icon: FileText },
];

function MiniMonth({ onChoose }: { onChoose?: () => void }) {
  const date = useCalendarStore((s) => s.date);
  const [offset, setOffset] = useState(0);
  const month = addMonths(date, offset);
  const today = useToday();
  const days = monthGrid(month, 1);
  return (
    <section className="mini-month" aria-label="Date picker">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold">
          {monthName(month)} {fromKey(month).getFullYear()}
        </span>
        <div className="flex">
          <button
            aria-label="Previous month in date picker"
            className="mini-arrow"
            onClick={() => setOffset((o) => o - 1)}
          >
            <ChevronLeft />
          </button>
          <button
            aria-label="Next month in date picker"
            className="mini-arrow"
            onClick={() => setOffset((o) => o + 1)}
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] text-fg-2 pb-1">
            {d}
          </span>
        ))}
        {days.map((d) => (
          <button
            key={d}
            aria-label={fromKey(d).toDateString()}
            aria-pressed={date === d}
            className={cn(
              "mini-day",
              !d.startsWith(month.slice(0, 7)) && "text-fg-2",
              d === today && "text-brand font-bold",
              d === date && "active",
            )}
            onClick={() => {
              useCalendarStore.getState().setDate(d);
              setOffset(0);
              onChoose?.();
            }}
          >
            {fromKey(d).getDate()}
          </button>
        ))}
      </div>
    </section>
  );
}

function SidebarDatePicker() {
  const date = useCalendarStore((s) => s.date);
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="sidebar-date-trigger"
          aria-label="Choose calendar date"
        >
          <CalendarDays size={16} />
          <span>
            {monthName(date)} {fromKey(date).getFullYear()}
          </span>
          <ChevronDown size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="date-picker-content"
        aria-label="Choose calendar date"
      >
        <MiniMonth onChoose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname().replace(/\/$/, "") || "/";
  const calendars = useStudentStore((s) => s.calendars);
  const assignments = useStudentStore((s) => s.assignments);
  const [courseOpen, setCourseOpen] = useState(false);
  return (
    <>
      <p className="sidebar-section-label">Main menu</p>
      <nav aria-label="Main navigation" className="student-nav">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={
              path === href || (href === "/clubs" && path === "/dashboard")
                ? "page"
                : undefined
            }
            className={cn(
              "student-nav-link",
              (path === href || (href === "/clubs" && path === "/dashboard")) &&
                "active",
            )}
          >
            <Icon size={17} />
            <span>{label}</span>
            {href === "/assignments" && assignments.some((a) => !a.done) && (
              <span className="nav-count">
                {assignments.filter((a) => !a.done).length}
              </span>
            )}
            {href === "/clubs" && <span className="local-pill">P2P</span>}
          </Link>
        ))}
      </nav>
      <SidebarDatePicker />
      <section className="sidebar-calendars px-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="eyebrow">MY CALENDARS</h2>
          <button
            className="mini-arrow"
            aria-label="Add course calendar"
            onClick={() => setCourseOpen(true)}
          >
            <Plus />
          </button>
        </div>
        <div className="grid gap-1">
          {calendars.map((c) => (
            <label key={c.id} className="calendar-check">
              <input
                type="checkbox"
                checked={!c.hidden}
                onChange={() => useStudentStore.getState().toggleCalendar(c.id)}
                style={{ accentColor: `var(--event-${c.color}-fg)` }}
              />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
        <button
          className="text-xs text-fg-2 flex items-center gap-1.5 mt-3"
          onClick={() => setCourseOpen(true)}
        >
          <BookOpen size={13} /> Add a course
        </button>
      </section>
      <div className="sidebar-footer mt-auto border-t border-hairline p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn("student-nav-link", path === "/settings" && "active")}
        >
          <Settings size={17} /> Settings & backups
        </Link>
      </div>
      <CourseDialog open={courseOpen} onClose={() => setCourseOpen(false)} />
    </>
  );
}

export function StudentShell({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  const isMobile = useIsMobile();
  const { resolvedTheme, setTheme } = useTheme();
  const ready = useStorageStatus((s) => s.ready);
  const error = useStorageStatus((s) => s.error);
  const path = usePathname().replace(/\/$/, "") || "/";
  // Prevent accidental browser navigation from losing an unsaved in-memory edit.
  useEffect(() => {
    if (!error) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [error]);
  return (
    <div className="student-app">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="student-topbar">
        <div className="topbar-brand-area">
          {isMobile && (
            <button
              className="icon-button mobile-menu-trigger"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
          )}
          <Link href="/" className="wordmark">
            candid<span className="wordmark-dot">.</span>
          </Link>
        </div>
        <div className="topbar-page-area">
          <p className="topbar-page-title">
            {path === "/settings"
              ? "Settings"
              : path === "/dashboard"
                ? "Clubs"
                : (NAV.find((item) => item.href === path)?.label ?? "Calendar")}
          </p>
          <div className="topbar-actions">
            <button
              aria-label="Search your planner"
              className="search-trigger topbar-search"
              onClick={() => openOverlay({ kind: "search" })}
            >
              <Search size={17} />
              <span className="search-placeholder">Search…</span>
              <kbd>⌘ / Ctrl K</kbd>
            </button>
            <button
              className="icon-button topbar-control desktop-help"
              aria-label="Keyboard shortcuts"
              onClick={() => openOverlay({ kind: "shortcuts" })}
            >
              <CircleHelp size={18} />
            </button>
            <button
              className="icon-button topbar-control"
              aria-label="Toggle light or dark theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun className="hidden dark:block" size={18} />
              <Moon className="dark:hidden" size={18} />
            </button>
            <span className="topbar-action-divider" aria-hidden />
            <Button
              variant="brand"
              className="topbar-create"
              aria-label="New event"
              onClick={() =>
                openOverlay({
                  kind: "event",
                  date: useCalendarStore.getState().date,
                })
              }
            >
              <CalendarPlus size={17} />
              <span>New event</span>
            </Button>
          </div>
        </div>
      </header>
      {error && (
        <div className="storage-warning" role="alert">
          {error} <Link href="/settings">Open backups</Link>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <aside className="student-sidebar hidden md:flex">
          <SidebarContent />
        </aside>
        <main id="main-content" tabIndex={-1} className="student-main">
          {ready ? (
            <div key={path} className="page-enter">
              {children}
            </div>
          ) : (
            <div className="loading-state" role="status">
              Opening your local planner…
            </div>
          )}
        </main>
      </div>
      <nav
        className="mobile-bottom-nav md:hidden"
        aria-label="Quick navigation"
      >
        {NAV.filter((item) =>
          ["/", "/assignments", "/scheduling", "/notes", "/clubs"].includes(
            item.href,
          ),
        ).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{label === "Focus timer" ? "Focus" : label}</span>
          </Link>
        ))}
      </nav>
      <Sheet open={isMobile && menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[270px] gap-0 bg-app p-0 pt-6">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Your planner, courses and settings.
          </SheetDescription>
          <SidebarContent onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>
      <GlobalDialogs />
      <GlobalSearch />
      <KeyboardShortcuts />
      <Reminders />
      <FocusMonitor />
    </div>
  );
}
