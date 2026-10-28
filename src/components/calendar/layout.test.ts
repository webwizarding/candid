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
    const out = layoutDay([
      ev("a", 540, 660),
      ev("b", 600, 720),
      ev("c", 690, 750),
    ]);
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

describe("calendar overlap sizing", () => {
  it("uses free adjacent columns after an overlap ends", () => {
    const result = layoutDay([
      ev("long", 540, 720),
      ev("early", 540, 600),
      ev("third", 550, 590),
      ev("later", 600, 660),
    ]);
    expect(result.find((p) => p.event.id === "later")).toMatchObject({
      column: 1,
      columns: 3,
      span: 2,
    });
    for (const a of result)
      for (const b of result) {
        if (
          a === b ||
          a.event.start >= b.event.end ||
          b.event.start >= a.event.end
        )
          continue;
        expect(
          a.column + a.span <= b.column || b.column + b.span <= a.column,
        ).toBe(true);
      }
  });
  it("gives events that only touch at a boundary their full width", () => {
    expect(
      layoutDay([ev("a", 540, 600), ev("b", 600, 660)]).map((p) => [
        p.columns,
        p.span,
      ]),
    ).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });
});
