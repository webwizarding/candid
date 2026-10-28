"use client";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { useStorageStatus } from "@/lib/local-storage";
import { useCalendarStore } from "@/stores/calendar-store";
const delivered = new Set<string>();
export function Reminders() {
  useEffect(() => {
    const check = () => {
      if (!useStorageStatus.getState().ready) return;
      const now = Date.now();
      for (const event of useAppStore.getState().events) {
        if (event.allDay || event.reminder == null || event.reminder < 0)
          continue;
        const start = new Date(`${event.date}T00:00:00`);
        start.setMinutes(event.start);
        const due = start.getTime() - event.reminder * 60000;
        const key = `${event.id}:${due}`;
        if (
          now >= due &&
          now < start.getTime() + 60000 &&
          !delivered.has(key)
        ) {
          delivered.add(key);
          toast(event.title, {
            description: event.reminder
              ? `Starts in ${Math.max(0, Math.ceil((start.getTime() - now) / 60000))} minutes`
              : "Starting now",
            duration: 15000,
            action: {
              label: "View",
              onClick: () =>
                useCalendarStore.getState().focusEvent(event.id, event.date),
            },
          });
        }
      }
    };
    check();
    const timer = setInterval(check, 15000);
    return () => clearInterval(timer);
  }, []);
  return null;
}
