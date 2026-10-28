import { describe, expect, it } from "vitest";
import { computeLeaveStats, durationLabel, formatDays, workingDays } from "./leave";
import { createSeed } from "./seed";

describe("leave rules", () => {
  it("reproduces the stats shown in the design from the seed", () => {
    const seed = createSeed();
    const stats = computeLeaveStats(seed, "2026-10-26");
    expect(stats.available).toBe(7);
    expect(stats.pendingCount).toBe(2);
    expect(stats.upcoming).toBe(3);
    expect(stats.contract).toBe(12);
    expect(stats.carryover).toBe(4);
    expect(stats.holidays).toBe(12);
  });

  it("skips weekends and public holidays when counting days", () => {
    const holidays = [{ id: "h", date: "2026-11-11", name: "Test" }];
    // Mon 9 → Sun 15: five weekdays minus one holiday
    expect(workingDays("2026-11-09", "2026-11-15", holidays)).toHaveLength(4);
  });

  it("labels durations naturally", () => {
    expect(durationLabel(1, 0)).toBe("1 day");
    expect(durationLabel(2, 4)).toBe("2 days 4 hours");
    expect(durationLabel(0, 1)).toBe("1 hour");
    expect(formatDays(0.75)).toBe("0.75");
    expect(formatDays(7)).toBe("7");
  });
});
