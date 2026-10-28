"use client";

import { create } from "zustand";
import { addDays, addMonths } from "@/lib/dates";
import { SERVER_TODAY } from "@/lib/seed";

export type CalendarView = "day" | "week" | "month";

/** Phones show the week view as three days starting at the focused day. */
export const COMPACT_WEEK_DAYS = 3;

/** What the details popover is showing and where it's anchored. */
export type PopoverTarget = {
  kind: "event" | "holiday";
  id: string;
  rect: { x: number; y: number; width: number; height: number };
};

type CalendarStore = {
  view: CalendarView;
  /** Focused day: drives the visible range and the accent date badge. */
  date: string;
  /** Asks the grid to scroll a specific event into view. */
  focusEventId: string | null;
  popover: PopoverTarget | null;
  /** True on phones: "week" renders as a 3-day window and steps by 3 days. */
  compact: boolean;
  setCompact: (compact: boolean) => void;
  setView: (view: CalendarView) => void;
  setDate: (date: string) => void;
  step: (dir: 1 | -1) => void;
  focusEvent: (id: string, date: string) => void;
  clearFocus: () => void;
  openPopover: (kind: PopoverTarget["kind"], id: string, el: Element) => void;
  closePopover: () => void;
};

export const useCalendarStore = create<CalendarStore>()((set, get) => ({
  view: "week",
  date: SERVER_TODAY,
  focusEventId: null,
  popover: null,
  compact: false,
  setCompact: (compact) => set({ compact }),
  setView: (view) => set({ view, popover: null }),
  setDate: (date) => set({ date, popover: null }),
  step: (dir) => {
    const { view, date, compact } = get();
    const weekStep = compact ? COMPACT_WEEK_DAYS : 7;
    const next = view === "day" ? addDays(date, dir) : view === "week" ? addDays(date, weekStep * dir) : addMonths(date, dir);
    set({ date: next, popover: null });
  },
  focusEvent: (id, date) => set({ focusEventId: id, date }),
  clearFocus: () => set({ focusEventId: null }),
  openPopover: (kind, id, el) => {
    const r = el.getBoundingClientRect();
    set({ popover: { kind, id, rect: { x: r.x, y: r.y, width: r.width, height: r.height } } });
  },
  closePopover: () => set({ popover: null }),
}));
