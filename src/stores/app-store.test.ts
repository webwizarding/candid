import { beforeEach, describe, expect, it } from "vitest";
import { redo, undo, useAppStore } from "./app-store";

import { createSeed } from "@/lib/seed";
beforeEach(() => {
  useAppStore.setState(createSeed());
  while (undo()) {
    /* drain prior history */
  }
});

const ev = () => useAppStore.getState().events.find((e) => e.id === "ev-2")!;

describe("undo / redo", () => {
  it("steps back and forward through data changes", () => {
    const before = ev().start;
    useAppStore
      .getState()
      .moveEvent("ev-2", { date: "2026-11-09", start: 780, end: 840 });
    expect(ev().start).toBe(780);

    expect(undo()).toBe("Calendar");
    expect(ev().start).toBe(before);
    expect(ev().date).toBe("2026-11-08");

    expect(redo()).toBe("Calendar");
    expect(ev().start).toBe(780);
  });

  it("restores a deleted event and labels leave changes", () => {
    useAppStore.getState().deleteEvent("ev-5");
    expect(useAppStore.getState().events.some((e) => e.id === "ev-5")).toBe(
      false,
    );
    undo();
    expect(useAppStore.getState().events.some((e) => e.id === "ev-5")).toBe(
      true,
    );

    useAppStore.getState().setRequestStatus("rq-6", "approved");
    expect(undo()).toBe("Leave request");
    expect(
      useAppStore.getState().requests.find((r) => r.id === "rq-6")!.status,
    ).toBe("pending");
  });

  it("does not record notifications", () => {
    while (undo()) {
      /* drain history */
    }
    useAppStore.getState().notify({ title: "t", body: "b" });
    expect(undo()).toBeNull();
  });
});
