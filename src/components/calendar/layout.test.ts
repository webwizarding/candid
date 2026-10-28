import { describe, expect, it } from "vitest";
import type { CalEvent } from "@/lib/types";
import { layoutDay, snap } from "./layout";

const ev = (id: string, start: number, end: number): CalEvent => ({
  id,
  title: id,
  date: "2026-11-10",
  start,
  end,
  allDay: false,
  color: "blue",
});

describe("layoutDay", () => {
  it("gives non-overlapping events the full width", () => {
    const out = layoutDay([ev("a", 420, 540), ev("b", 660, 780)]);
    expect(out.map((p) => p.columns)).toEqual([1, 1]);
  });

  it("splits overlapping events into columns", () => {
    const out = layoutDay([ev("a", 540, 660), ev("b", 600, 720), ev("c", 690, 750)]);
    const byId = Object.fromEntries(out.map((p) => [p.event.id, p]));
    expect(byId.a.column).toBe(0);
    expect(byId.b.column).toBe(1);
    expect(byId.c.column).toBe(0);
    expect(out.every((p) => p.columns === 2)).toBe(true);
  });

  it("snaps to 15-minute steps", () => {
    expect(snap(607)).toBe(600);
    expect(snap(608)).toBe(615);
  });
});
