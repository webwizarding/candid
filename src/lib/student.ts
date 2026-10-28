import { addDays, diffDays, toKey } from "./dates";
import type { CalEvent, EventColor } from "./types";

export type CourseCalendar = {
  id: string;
  name: string;
  color: EventColor;
  hidden: boolean;
};
export type Assignment = {
  id: string;
  title: string;
  courseId: string;
  due: string;
  estimate: number;
  done: boolean;
  priority: "normal" | "high";
  notes: string;
};
export const DEFAULT_CALENDARS: CourseCalendar[] = [
  { id: "classes", name: "Classes", color: "purple", hidden: false },
  { id: "study", name: "Study time", color: "blue", hidden: false },
  { id: "personal", name: "Personal", color: "green", hidden: false },
];
export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    toKey(new Date(`${value}T12:00:00`)) === value
  );
}
export function repeatDates(
  date: string,
  until: string,
  days: number[],
): string[] {
  if (
    !validDate(date) ||
    !validDate(until) ||
    until < date ||
    diffDays(date, until) > 366
  )
    throw new Error(
      "Choose a repeat end date within one year of the first event.",
    );
  const dates: string[] = [];
  for (let d = date; d <= until; d = addDays(d, 1))
    if (days.includes(new Date(`${d}T12:00:00`).getDay())) dates.push(d);
  if (!dates.length)
    throw new Error("Choose at least one weekday in this date range.");
  return dates;
}
export function conflicts(
  event: Pick<CalEvent, "id" | "date" | "start" | "end" | "allDay">,
  events: CalEvent[],
) {
  return events.filter(
    (e) =>
      e.id !== event.id &&
      !event.allDay &&
      !e.allDay &&
      e.date === event.date &&
      e.start < event.end &&
      event.start < e.end,
  );
}
export function findStudySlot(
  events: CalEvent[],
  day: string,
  minutes: number,
  start = 8 * 60,
): { date: string; start: number; end: number } | null {
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(day, offset);
    for (
      let time = offset === 0 ? Math.ceil(start / 15) * 15 : 8 * 60;
      time + minutes <= 21 * 60;
      time += 15
    ) {
      if (
        !conflicts(
          { id: "", date, start: time, end: time + minutes, allDay: false },
          events,
        ).length
      )
        return { date, start: time, end: time + minutes };
    }
  }
  return null;
}
