"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SHORTCUTS } from "@/components/shell/keyboard-shortcuts";
import { formatWeekday, MONTHS } from "@/lib/dates";
import { computeLeaveStats, formatDays } from "@/lib/leave";
import { cn } from "@/lib/utils";
import { useToday } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";

type BaseProps = { open: boolean; onClose: () => void };

export function HolidaysDialog({ open, onClose }: BaseProps) {
  const router = useRouter();
  const today = useToday();
  const holidays = useAppStore((s) => s.holidays);
  const addHoliday = useAppStore((s) => s.addHoliday);
  const removeHoliday = useAppStore((s) => s.removeHoliday);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");

  const year = today.slice(0, 4);
  const list = holidays.filter((h) => h.date.startsWith(year));
  const next = list.find((h) => h.date >= today);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="gap-4 p-5 sm:max-w-[440px]">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="t-16">National holidays {year}</DialogTitle>
          <DialogDescription className="t-14">
            {list.length} public holidays · they’re never deducted from your allowance.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="-mx-2 max-h-[360px]">
          <ul className="grid gap-0.5 px-2">
            {list.map((h) => {
              const past = h.date < today;
              return (
                <li key={h.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      useCalendarStore.getState().setDate(h.date);
                      onClose();
                      router.push("/time-off");
                    }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover-fine:bg-hover",
                      past && "opacity-55",
                    )}
                  >
                    <span className="flex w-11 shrink-0 flex-col items-center gap-1 rounded-md bg-[var(--event-purple-bg)] py-1.5 text-[var(--event-purple-fg)]">
                      <span className="text-[10px] leading-none tracking-wide uppercase">{MONTHS[Number(h.date.slice(5, 7)) - 1].slice(0, 3)}</span>
                      <span className="t-16">{Number(h.date.slice(8))}</span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="t-14 truncate text-fg">{h.name}</span>
                      <span className="t-12 text-fg-2">{formatWeekday(h.date)}</span>
                    </span>
                    {next?.id === h.id && (
                      <span className="t-12 shrink-0 rounded-md bg-brand-tint px-1.5 py-1 text-brand">Next up</span>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${h.name}`}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => removeHoliday(h.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
        {adding ? (
          <form
            className="grid grid-cols-[1fr_1.3fr_auto] gap-2 max-sm:grid-cols-[1fr_auto] max-sm:[&>*:first-child]:col-span-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!date || !name.trim()) return;
              addHoliday(date, name.trim());
              setDate("");
              setName("");
              setAdding(false);
            }}
          >
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} aria-label="Holiday date" />
            <Input required placeholder="Holiday name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Button type="submit" variant="brand">
              Add
            </Button>
          </form>
        ) : (
          <DialogFooter className="-mx-5 -mb-5 bg-app px-5 py-3">
            <Button onClick={() => setAdding(true)}>
              <PlusIcon /> Add holiday
            </Button>
            <Button variant="brand" onClick={onClose}>
              Done
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PolicyDialog({ open, onClose }: BaseProps) {
  const today = useToday();
  const requests = useAppStore((s) => s.requests);
  const settings = useAppStore((s) => s.settings);
  const holidays = useAppStore((s) => s.holidays);
  const stats = computeLeaveStats({ requests, settings, holidays }, today);
  const total = stats.contract + stats.carryover;
  const used = total - stats.available - stats.pendingDays;

  const sections = [
    {
      title: "Annual allowance",
      body: `Your contract includes ${stats.contract} days of paid time off per calendar year, plus ${stats.carryover} carryover days from last year.`,
    },
    {
      title: "How days are counted",
      body: "Only working days count. Weekends and national holidays inside a request are skipped automatically; partial days are counted in hours (8h = 1 day).",
    },
    {
      title: "Approval",
      body: "Requests go to your manager. Pending requests are held against your balance until they’re approved or declined.",
    },
    {
      title: "Sick leave",
      body: "Sick leave longer than one day needs a medical certificate uploaded in Documents within 3 working days.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="gap-5 p-5 sm:max-w-[480px]">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="t-16">Time off policy</DialogTitle>
          <DialogDescription className="t-14">How your allowance works this year.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <div className="flex h-2 overflow-hidden rounded-full bg-hairline">
            <span className="bg-success transition-[width] duration-500 ease-(--ease-out)" style={{ width: `${(used / total) * 100}%` }} />
            <span className="bg-warning" style={{ width: `${(stats.pendingDays / total) * 100}%` }} />
          </div>
          <div className="t-12 flex gap-4 text-fg-2">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success" /> {formatDays(used)} used
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-warning" /> {formatDays(stats.pendingDays)} pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-hairline" /> {formatDays(stats.available)} available
            </span>
          </div>
        </div>
        <div className="grid gap-4">
          {sections.map((s) => (
            <section key={s.title} className="grid gap-1.5">
              <h3 className="t-14 text-fg">{s.title}</h3>
              <p className="t-14 leading-[1.45] text-fg-2">{s.body}</p>
            </section>
          ))}
        </div>
        <DialogFooter className="-mx-5 -mb-5 bg-app px-5 py-3">
          <Button variant="brand" onClick={onClose}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShortcutsDialog({ open, onClose }: BaseProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="gap-4 p-5 sm:max-w-[400px]">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="t-16">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="t-14">Move around without leaving the keyboard.</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-1">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex h-8 items-center justify-between">
              <span className="t-14 text-fg">{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="flex h-6 min-w-6 items-center justify-center rounded-md border border-control bg-app px-1.5 font-mono text-[12px] text-fg-2"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

