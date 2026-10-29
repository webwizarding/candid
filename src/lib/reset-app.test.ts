import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAppStorage } from "./reset-app";
import { localStorageAdapter, setStorageResetting } from "./local-storage";

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
afterEach(() => {
  setStorageResetting(false);
  vi.unstubAllGlobals();
});

describe("full app reset", () => {
  it("clears all current and legacy app data, preferences and session data, and blocks late autosaves", () => {
    const local = new MemoryStorage(),
      session = new MemoryStorage();
    for (const key of [
      "calender:events:v1",
      "calender:student:v1",
      "calender:clubs:v1",
      "candid:notes:v1",
      "candid:scheduling:v1",
      "candid:future:data",
      "theme",
    ])
      local.setItem(key, "private data");
    local.setItem("unrelated", "keep");
    session.setItem("candid:draft", "private draft");
    session.setItem("unrelated", "keep");
    vi.stubGlobal("localStorage", local);
    clearAppStorage(local, session);
    expect([...local.data]).toEqual([["unrelated", "keep"]]);
    expect([...session.data]).toEqual([["unrelated", "keep"]]);
    localStorageAdapter.setItem("candid:notes:v1", "late editor autosave");
    expect(local.getItem("candid:notes:v1")).toBeNull();
  });
  it("restores removed values if storage refuses to complete the reset", () => {
    const local = new MemoryStorage(),
      session = new MemoryStorage();
    local.setItem("calender:events:v1", "events");
    local.setItem("candid:notes:v1", "notes");
    session.setItem("candid:draft", "draft");
    const before = [...local.data];
    vi.spyOn(session, "removeItem").mockImplementation(() => {
      throw new Error("Storage denied");
    });
    vi.stubGlobal("localStorage", local);
    expect(() => clearAppStorage(local, session)).toThrow("could not finish");
    expect([...local.data]).toEqual(before);
    expect(session.getItem("candid:draft")).toBe("draft");
    localStorageAdapter.setItem("candid:notes:v1", "new edit");
    expect(local.getItem("candid:notes:v1")).toBe("new edit");
  });
});
