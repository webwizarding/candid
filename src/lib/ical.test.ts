import { describe, expect, it } from "vitest";
import { exportIcs, importIcs } from "./ical";
import type { CalEvent } from "./types";
const wrap = (body: string) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR`;
const source: CalEvent = {
  id: "e1",
  title: "Biology, lab; revision 🧪",
  date: "2026-10-28",
  start: 540,
  end: 600,
  allDay: false,
  color: "purple",
  note: "Line one\nLine two",
};
describe("iCalendar portability", () => {
  it("round trips times, escaped text, unicode and notes", () => {
    const result = importIcs(exportIcs([source]), source.date).events;
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: source.title,
      note: source.note,
      date: source.date,
      start: 540,
      end: 600,
    });
  });
  it("keeps all-day dates and exclusive end dates intact", () => {
    const result = importIcs(
      exportIcs([{ ...source, allDay: true, start: 0, end: 1440 }]),
      source.date,
    );
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      allDay: true,
      date: source.date,
      start: 0,
      end: 1440,
    });
  });
  it("handles a timed event ending at midnight", () => {
    const result = importIcs(
      exportIcs([{ ...source, start: 1380, end: 1440 }]),
      source.date,
    );
    expect(result.events).toHaveLength(1);
    expect(result.events[0].end).toBe(1440);
  });
  it("expands weekly recurrence and honors excluded dates", () => {
    const result = importIcs(
      wrap(
        "BEGIN:VEVENT\r\nUID:weekly\r\nDTSTART:20261028T090000\r\nDTEND:20261028T100000\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nEXDATE:20261104T090000\r\nSUMMARY:Lecture\r\nEND:VEVENT",
      ),
      source.date,
    );
    expect(result.events.map((e) => e.date)).toEqual([
      "2026-10-28",
      "2026-11-11",
    ]);
  });
  it("uses stable IDs so repeated imports update rather than duplicate", () => {
    const text = exportIcs([source]);
    expect(importIcs(text, source.date).events[0].id).toBe(
      importIcs(text, source.date).events[0].id,
    );
  });
  it("rejects unsupported high-frequency recurrence instead of hanging", () => {
    expect(() =>
      importIcs(
        wrap(
          "BEGIN:VEVENT\r\nUID:bad\r\nDTSTART:20261028T090000\r\nDTEND:20261028T100000\r\nRRULE:FREQ=SECONDLY\r\nEND:VEVENT",
        ),
        source.date,
      ),
    ).toThrow("Sub-daily");
  });
  it("requires timezone data rather than silently importing wrong times", () => {
    expect(() =>
      importIcs(
        wrap(
          "BEGIN:VEVENT\r\nUID:bad-zone\r\nDTSTART;TZID=America/New_York:20261028T090000\r\nDTEND;TZID=America/New_York:20261028T100000\r\nEND:VEVENT",
        ),
        source.date,
      ),
    ).toThrow("timezone definition");
  });
});
