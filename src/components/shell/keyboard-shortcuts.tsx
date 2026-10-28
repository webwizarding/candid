"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { deleteCalendarEvent } from "@/components/calendar/delete-event";
import { redo, undo } from "@/stores/app-store";
import { useToday } from "@/hooks/use-today";
import { useCalendarStore } from "@/stores/calendar-store";
import { openOverlay, useOverlayStore } from "@/stores/overlay-store";

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Search" },
  { keys: ["⌘", "Z"], label: "Undo" },
  { keys: ["⇧", "⌘", "Z"], label: "Redo" },
  { keys: ["⌫"], label: "Delete selected event" },
  { keys: ["N"], label: "New event" },
  { keys: ["T"], label: "Go to today" },
  { keys: ["←"], label: "Previous period" },
  { keys: ["→"], label: "Next period" },
  { keys: ["D"], label: "Day view" },
  { keys: ["W"], label: "Week view" },
  { keys: ["M"], label: "Month view" },
  { keys: ["?"], label: "Show shortcuts" },
];

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Single-key shortcuts. These act instantly — keyboard actions never animate. */
export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const today = useToday();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return; // text fields keep their native undo/delete

      // ⌘Z / Ctrl+Z undo · ⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y redo
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && !e.altKey && (k === "z" || (k === "y" && e.ctrlKey))) {
        e.preventDefault();
        const isRedo = k === "y" || e.shiftKey;
        const label = isRedo ? redo() : undo();
        if (label) {
          toast(isRedo ? "Redone" : "Undone", {
            description: label,
            action: { label: isRedo ? "Undo" : "Redo", onClick: () => void (isRedo ? undo() : redo()) },
          });
        } else {
          toast(isRedo ? "Nothing to redo" : "Nothing to undo");
        }
        return;
      }

      // Delete / Backspace removes the selected event (open in the popover, or focused).
      if ((e.key === "Delete" || e.key === "Backspace") && !mod && !e.altKey) {
        const popover = useCalendarStore.getState().popover;
        const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-event-id]");
        const id = popover?.kind === "event" ? popover.id : focused?.dataset.eventId;
        if (id && useOverlayStore.getState().overlay.kind === "none") {
          e.preventDefault();
          deleteCalendarEvent(id);
        }
        return;
      }

      if (mod || e.altKey) return;
      if (useOverlayStore.getState().overlay.kind !== "none") return;
      if (document.querySelector("[role=dialog],[role=menu],[data-radix-popper-content-wrapper]")) return;

      const cal = useCalendarStore.getState();
      const onCalendar = pathname === "/";
      const key = e.key;

      if (key === "?") openOverlay({ kind: "shortcuts" });
      else if (key === "n" || key === "N") openOverlay({ kind: "event", date: cal.date });
      else if (key === "t" || key === "T") {
        cal.setDate(today);
        if (!onCalendar) router.push("/");
      } else if (onCalendar && key === "ArrowLeft") cal.step(-1);
      else if (onCalendar && key === "ArrowRight") cal.step(1);
      else if (onCalendar && (key === "d" || key === "D")) cal.setView("day");
      else if (onCalendar && (key === "w" || key === "W")) cal.setView("week");
      else if (onCalendar && (key === "m" || key === "M")) cal.setView("month");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router, today]);

  return null;
}
