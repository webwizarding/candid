import { describe, expect, it } from "vitest";
import {
  decodeBackup,
  encryptBackup,
  validateBackup,
  type PlannerBackup,
} from "./backup";
import { createStudentSeed } from "./student-seed";
import { DEFAULT_CALENDARS } from "./student";
const backup: PlannerBackup = {
  format: "calender-backup",
  version: 1,
  exportedAt: "2026-10-28",
  events: [],
  assignments: [],
  calendars: DEFAULT_CALENDARS,
  settings: createStudentSeed().settings,
  clubs: [],
};
describe("local backups", () => {
  it("round trips an encrypted backup", async () => {
    const text = await encryptBackup(backup, "a private password");
    expect(text).not.toContain("Classes");
    expect(await decodeBackup(text, "a private password")).toMatchObject({
      calendars: DEFAULT_CALENDARS,
      events: [],
    });
  });
  it("rejects a wrong password", async () => {
    const text = await encryptBackup(backup, "correct password");
    await expect(decodeBackup(text, "wrong password")).rejects.toThrow(
      "incorrect",
    );
  });
  it("rejects tampered encrypted data", async () => {
    const value = JSON.parse(await encryptBackup(backup, "correct password"));
    value.ciphertext =
      (value.ciphertext[0] === "A" ? "B" : "A") + value.ciphertext.slice(1);
    await expect(
      decodeBackup(JSON.stringify(value), "correct password"),
    ).rejects.toThrow();
  });
  it("rejects malformed backup data before applying anything", () => {
    expect(() =>
      validateBackup({ ...backup, events: [{ title: "not a valid event" }] }),
    ).toThrow();
    expect(() =>
      validateBackup({
        ...backup,
        calendars: [DEFAULT_CALENDARS[0], DEFAULT_CALENDARS[0]],
      }),
    ).toThrow("duplicate");
  });
  it("requires an eight-character export password", async () => {
    await expect(encryptBackup(backup, "short")).rejects.toThrow(
      "8 characters",
    );
  });
});
