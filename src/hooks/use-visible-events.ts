"use client";
import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useStudentStore } from "@/stores/student-store";

export function useVisibleEvents() {
  const events = useAppStore((s) => s.events);
  const calendars = useStudentStore((s) => s.calendars);
  return useMemo(
    () =>
      events.filter(
        (e) => !calendars.find((c) => c.id === e.calendarId)?.hidden,
      ),
    [events, calendars],
  );
}
