import ICAL from "ical.js";
import { addDays, toKey } from "./dates";
import type { CalEvent } from "./types";

/** Exports expanded occurrences; floating local times preserve the student's wall-clock timetable. */
export function exportIcs(events: CalEvent[]) {
  const root = new ICAL.Component(["vcalendar", [], []]);
  root.updatePropertyWithValue("version", "2.0");
  root.updatePropertyWithValue(
    "prodid",
    "-//Candid//Local Student Planner//EN",
  );
  for (const item of events) {
    const component = new ICAL.Component("vevent");
    const event = new ICAL.Event(component);
    event.uid = `${item.id}@calender.local`;
    event.summary = item.title;
    event.description = item.note ?? "";
    event.location = item.location ?? "";
    const dateTime = (date: string, minutes: number) =>
      ICAL.Time.fromDateTimeString(
        `${date}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`,
      );
    event.startDate = item.allDay
      ? ICAL.Time.fromDateString(item.date)
      : dateTime(item.date, item.start);
    event.endDate = item.allDay
      ? ICAL.Time.fromDateString(addDays(item.date, 1))
      : item.end === 1440
        ? dateTime(addDays(item.date, 1), 0)
        : dateTime(item.date, item.end);
    root.addSubcomponent(component);
  }
  return root.toString();
}
export function importIcs(
  text: string,
  anchor: string,
): { events: CalEvent[]; recurring: boolean } {
  if (text.length > 2000000)
    throw new Error("Choose a calendar file under 2 MB.");
  const root = new ICAL.Component(ICAL.parse(text));
  if (root.name !== "vcalendar")
    throw new Error("Choose a valid iCalendar (.ics) file.");
  for (const component of root.getAllSubcomponents("vtimezone")) {
    const tzid = String(component.getFirstPropertyValue("tzid"));
    ICAL.TimezoneService.register(new ICAL.Timezone({ component, tzid }));
  }
  const events: CalEvent[] = [];
  let recurring = false;
  let iterations = 0;
  const lower = addDays(anchor, -30);
  const upper = addDays(anchor, 366);
  const components = root.getAllSubcomponents("vevent");
  if (components.length > 10000)
    throw new Error("This calendar contains more than 10,000 events.");
  for (const component of components) {
    const source = new ICAL.Event(component);
    if ((source.uid?.length ?? 0) > 200)
      throw new Error("A calendar event identifier exceeds the import limit.");
    if (
      source.isRecurrenceException() ||
      component.getFirstPropertyValue("status") === "CANCELLED"
    )
      continue;
    for (const property of ["dtstart", "dtend"].map((p) =>
      component.getFirstProperty(p),
    )) {
      const zone = property?.getParameter("tzid");
      if (zone && !ICAL.TimezoneService.has(String(zone)))
        throw new Error(
          `The file uses ${zone} without its timezone definition. Export the calendar with VTIMEZONE data, or use UTC times.`,
        );
    }
    const isRecurring = source.isRecurring();
    recurring ||= isRecurring;
    const frequencies = source.getRecurrenceTypes();
    if (frequencies.SECONDLY || frequencies.MINUTELY || frequencies.HOURLY)
      throw new Error(
        "Sub-daily recurrence is not supported. Export daily or weekly events instead.",
      );
    const iterator = isRecurring ? source.iterator() : null;
    let occurrence: ICAL.Time | null = iterator
      ? iterator.next()
      : source.startDate;
    while (occurrence) {
      if (++iterations > 25000)
        throw new Error(
          "This recurrence expands beyond the safe import limit. Export a shorter date range.",
        );
      const details = isRecurring
        ? source.getOccurrenceDetails(occurrence)
        : {
            startDate: source.startDate,
            endDate: source.endDate,
            item: source,
          };
      const start = details.startDate.toJSDate();
      const finish = details.endDate.toJSDate();
      // Timed VEVENTs with no DTEND are valid zero-duration deadlines.
      if (!details.startDate.isDate && finish.getTime() === start.getTime())
        finish.setMinutes(finish.getMinutes() + 15);
      const first = toKey(start);
      const last = toKey(finish);
      if (isRecurring && first > upper) break;
      if (!isRecurring || first >= lower) {
        if (
          !Number.isFinite(start.getTime()) ||
          !Number.isFinite(finish.getTime()) ||
          finish <= start
        )
          throw new Error(
            "A calendar event has a missing or invalid end time.",
          );
        let pieces = 0;
        for (let date = first; date <= last; date = addDays(date, 1)) {
          if (++pieces > 367)
            throw new Error(
              "An event lasts more than one year. Import a shorter range.",
            );
          const begin =
            date === first ? start.getHours() * 60 + start.getMinutes() : 0;
          const end =
            date === last ? finish.getHours() * 60 + finish.getMinutes() : 1440;
          if (end <= begin) continue;
          const title = details.item.summary || "Untitled event";
          if (
            title.length > 1000 ||
            (details.item.description?.length ?? 0) > 10000 ||
            (details.item.location?.length ?? 0) > 2000
          )
            throw new Error(
              "A calendar event contains unusually long text. Shorten it before importing.",
            );
          events.push({
            id:
              !isRecurring && /@(calender|candid)\.local$/.test(source.uid)
                ? source.uid.replace(/@(calender|candid)\.local$/, "")
                : `ics-${encodeURIComponent(source.uid || source.summary)}-${occurrence.toString()}-${date}`,
            title,
            date,
            start: details.startDate.isDate ? 0 : begin,
            end: details.startDate.isDate ? 1440 : end,
            allDay: details.startDate.isDate,
            color: "purple",
            calendarId: "classes",
            kind: "class",
            note: details.item.description ?? "",
            location: details.item.location ?? "",
          });
          if (events.length > 10000)
            throw new Error(
              "More than 10,000 occurrences. Import a smaller calendar.",
            );
        }
      }
      occurrence = iterator?.next() ?? null;
    }
  }
  return {
    events: [...new Map(events.map((e) => [e.id, e])).values()],
    recurring,
  };
}
