import type { CalEvent, Settings } from "./types";
import { type Assignment, type CourseCalendar, validDate } from "./student";
import { type Club, validateClubPacket } from "./clubs";
export type PlannerBackup = {
  format: "calender-backup";
  version: 1;
  exportedAt: string;
  events: CalEvent[];
  calendars: CourseCalendar[];
  assignments: Assignment[];
  settings: Settings;
  clubs: Club[];
};
const colors = ["purple", "blue", "cyan", "green", "orange", "pink"];
const string = (v: unknown, limit: number): v is string =>
  typeof v === "string" && v.length <= limit;
function items<T>(v: unknown, validate: (v: T) => boolean): T[] {
  if (!Array.isArray(v) || v.length > 10000 || !v.every(validate))
    throw new Error("The backup contains invalid data. Nothing was imported.");
  const ids = v.map((x) => x.id);
  if (new Set(ids).size !== ids.length)
    throw new Error("The backup contains duplicate identifiers.");
  return v;
}
export function validateBackup(value: unknown): PlannerBackup {
  if (!value || typeof value !== "object")
    throw new Error("This is not a Candid backup.");
  const p = value as PlannerBackup;
  if (p.format !== "calender-backup" || p.version !== 1)
    throw new Error("Unsupported backup format or version.");
  const events = items<CalEvent>(
    p.events,
    (e) =>
      !!e &&
      string(e.id, 1000) &&
      !!e.id &&
      string(e.title, 1000) &&
      validDate(e.date) &&
      Number.isInteger(e.start) &&
      Number.isInteger(e.end) &&
      e.start >= 0 &&
      e.end <= 1440 &&
      e.end > e.start &&
      typeof e.allDay === "boolean" &&
      colors.includes(e.color) &&
      (e.note == null || string(e.note, 10000)) &&
      (e.location == null || string(e.location, 2000)) &&
      (e.calendarId == null || string(e.calendarId, 100)) &&
      (e.seriesId == null || string(e.seriesId, 1000)) &&
      (e.reminder == null ||
        (Number.isInteger(e.reminder) &&
          e.reminder >= -1 &&
          e.reminder <= 1440)) &&
      (e.kind == null ||
        ["class", "study", "exam", "personal"].includes(e.kind)),
  ).map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    color: e.color,
    note: e.note,
    location: e.location,
    calendarId: e.calendarId,
    seriesId: e.seriesId,
    kind: e.kind,
    reminder: e.reminder,
  }));
  const calendars = items<CourseCalendar>(
    p.calendars,
    (c) =>
      !!c &&
      string(c.id, 100) &&
      !!c.id &&
      string(c.name, 100) &&
      !!c.name.trim() &&
      colors.includes(c.color) &&
      typeof c.hidden === "boolean",
  ).map((c) => ({ id: c.id, name: c.name, color: c.color, hidden: c.hidden }));
  const assignments = items<Assignment>(
    p.assignments,
    (a) =>
      !!a &&
      string(a.id, 100) &&
      !!a.id &&
      string(a.title, 200) &&
      validDate(a.due) &&
      string(a.courseId, 100) &&
      Number.isInteger(a.estimate) &&
      a.estimate >= 15 &&
      a.estimate <= 2400 &&
      typeof a.done === "boolean" &&
      ["normal", "high"].includes(a.priority) &&
      string(a.notes, 10000),
  ).map((a) => ({
    id: a.id,
    title: a.title,
    due: a.due,
    courseId: a.courseId,
    estimate: a.estimate,
    done: a.done,
    priority: a.priority,
    notes: a.notes,
  }));
  const s = p.settings;
  if (
    !s ||
    ![0, 1].includes(s.weekStartsOn) ||
    !["12h", "24h"].includes(s.timeFormat) ||
    !Number.isInteger(s.dayStartHour) ||
    s.dayStartHour < 0 ||
    s.dayStartHour > 23 ||
    typeof s.showWeekends !== "boolean"
  )
    throw new Error("Invalid calendar preferences in backup.");
  if (!Array.isArray(p.clubs) || p.clubs.length > 100)
    throw new Error("Invalid clubs in backup.");
  const clubs = p.clubs.map(
    (club) =>
      validateClubPacket({ format: "calender-club", version: 1, club }).club,
  );
  return {
    format: "calender-backup",
    version: 1,
    exportedAt: string(p.exportedAt, 100) ? p.exportedAt : "",
    events,
    calendars,
    assignments,
    clubs,
    settings: {
      weekStartsOn: s.weekStartsOn,
      timeFormat: s.timeFormat,
      dayStartHour: s.dayStartHour,
      showWeekends: s.showWeekends,
      contractDays: 0,
      carryoverDays: 0,
      emailNotifications: false,
      pushNotifications: false,
      weeklyDigest: false,
    },
  };
}
const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (const byte of bytes) s += String.fromCharCode(byte);
  return btoa(s);
};
const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
async function passwordKey(password: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", iterations: 250000, salt },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptBackup(
  value: unknown,
  password: string,
): Promise<string> {
  if (password.length < 8)
    throw new Error("Use a backup password of at least 8 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await passwordKey(password, salt),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return JSON.stringify({
    format: "calender-encrypted",
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  });
}
export async function decodeBackup(
  text: string,
  password: string,
): Promise<PlannerBackup> {
  const envelope = JSON.parse(text);
  if (envelope.format !== "calender-encrypted") return validateBackup(envelope);
  if (
    envelope.version !== 1 ||
    !string(envelope.salt, 24) ||
    !string(envelope.iv, 16) ||
    !string(envelope.ciphertext, 10000000)
  )
    throw new Error("Invalid encrypted backup.");
  let decoded: unknown;
  try {
    const salt = fromBase64(envelope.salt);
    const iv = fromBase64(envelope.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error();
    const result = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      await passwordKey(password, salt),
      fromBase64(envelope.ciphertext),
    );
    decoded = JSON.parse(new TextDecoder().decode(result));
  } catch {
    throw new Error("The password is incorrect or the backup is damaged.");
  }
  return validateBackup(decoded);
}
