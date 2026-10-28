import { describe, expect, it } from "vitest";
import { conflicts, findStudySlot, repeatDates, validDate } from "./student";
import type { CalEvent } from "./types";
const event: CalEvent = {
  id: "e",
  date: "2026-10-28",
  title: "Class",
  start: 540,
  end: 600,
  allDay: false,
  color: "blue",
};
describe("student scheduling", () => {
  it("validates real dates", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2028-02-29")).toBe(true);
  });
  it("expands the selected weekdays across DST without shifting local days", () => {
    expect(repeatDates("2026-10-26", "2026-11-09", [1, 3])).toEqual([
      "2026-10-26",
      "2026-10-28",
      "2026-11-02",
      "2026-11-04",
      "2026-11-09",
    ]);
  });
  it("bounds repeat schedules and rejects empty weekday choices", () => {
    expect(() => repeatDates("2026-10-28", "2028-01-01", [1])).toThrow();
    expect(() => repeatDates("2026-10-28", "2026-11-10", [])).toThrow();
  });
  it("allows back-to-back events but identifies actual overlaps", () => {
    expect(
      conflicts({ ...event, id: "new", start: 600, end: 660 }, [event]),
    ).toHaveLength(0);
    expect(
      conflicts({ ...event, id: "new", start: 590, end: 650 }, [event]),
    ).toHaveLength(1);
  });
  it("finds a gap after a class instead of double booking", () => {
    expect(findStudySlot([event], event.date, 60, 540)).toEqual({
      date: event.date,
      start: 600,
      end: 660,
    });
  });
  it("moves late-night requests to the next morning", () => {
    expect(findStudySlot([], event.date, 60, 1300)?.date).toBe("2026-10-29");
  });
});
