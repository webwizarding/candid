import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  diffDays,
  formatRange,
  formatTime,
  isoWeek,
  monthGrid,
  parseTime,
  startOfWeek,
  weekDays,
} from "./dates";

describe("dates", () => {
  it("builds the design's Sunday-first week around Tue Nov 10, 2026", () => {
    expect(weekDays("2026-11-10", 0)).toEqual([
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
    ]);
    expect(startOfWeek("2026-11-10", 1)).toBe("2026-11-09");
  });

  it("reports ISO week 46 for that week", () => {
    expect(isoWeek("2026-11-09")).toBe(46);
    expect(isoWeek("2026-01-01")).toBe(1);
    expect(isoWeek("2027-01-01")).toBe(53);
  });

  it("formats ranges within and across months", () => {
    expect(formatRange("2026-11-08", "2026-11-14")).toBe("Nov 8 – 14");
    expect(formatRange("2026-10-25", "2026-10-31")).toBe("Oct 25 – 31");
    expect(formatRange("2026-11-29", "2026-12-05")).toBe("Nov 29 – Dec 5");
  });

  it("adds days and months without drifting", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(diffDays("2026-11-08", "2026-11-14")).toBe(6);
  });

  it("returns a 6×7 month grid starting on the week start", () => {
    const grid = monthGrid("2026-11-10", 0);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-11-01");
  });

  it("formats and parses times in 24h and 12h", () => {
    expect(formatTime(7 * 60)).toBe("07:00");
    expect(formatTime(13 * 60 + 30, "12h")).toBe("1:30 PM");
    expect(formatTime(0, "12h")).toBe("12:00 AM");
    expect(parseTime("09:45")).toBe(585);
  });
});
