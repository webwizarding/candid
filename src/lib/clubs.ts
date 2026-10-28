import { validDate } from "./student";
export type ClubRecord = {
  id: string;
  type: "event" | "task" | "post";
  title: string;
  body: string;
  date: string;
  start: number;
  end: number;
  done: boolean;
  deleted: boolean;
  clock: number;
  author: string;
  authorName: string;
  assignee: string;
};
export type Club = { id: string; name: string; records: ClubRecord[] };
export type ClubPacket = { format: "calender-club"; version: 1; club: Club };
export function clubPacket(club: Club): ClubPacket {
  return { format: "calender-club", version: 1, club };
}
const bounded = (s: unknown, max: number): s is string =>
  typeof s === "string" && s.length <= max;
export function validateClubPacket(value: unknown): ClubPacket {
  if (!value || typeof value !== "object")
    throw new Error("This is not a club snapshot.");
  const p = value as ClubPacket;
  if (
    p.format !== "calender-club" ||
    p.version !== 1 ||
    !p.club ||
    !bounded(p.club.id, 100) ||
    !p.club.id ||
    !bounded(p.club.name, 100) ||
    !p.club.name.trim() ||
    !Array.isArray(p.club.records) ||
    p.club.records.length > 5000
  )
    throw new Error("Invalid or unsupported club snapshot.");
  const ids = new Set<string>();
  const records = p.club.records.map((r) => {
    if (
      !r ||
      !bounded(r.id, 100) ||
      !r.id ||
      ids.has(r.id) ||
      !["event", "task", "post"].includes(r.type) ||
      !bounded(r.title, 200) ||
      !bounded(r.body, 10000) ||
      !bounded(r.author, 100) ||
      !bounded(r.authorName, 80) ||
      !bounded(r.assignee, 80) ||
      typeof r.done !== "boolean" ||
      typeof r.deleted !== "boolean" ||
      !Number.isSafeInteger(r.clock) ||
      r.clock < 1 ||
      r.clock > 1e12 ||
      !bounded(r.date, 10) ||
      (r.type !== "post" && !validDate(r.date)) ||
      !Number.isInteger(r.start) ||
      !Number.isInteger(r.end) ||
      r.start < 0 ||
      r.end > 1440 ||
      r.end <= r.start
    )
      throw new Error(
        "The club contains an invalid record. Nothing was imported.",
      );
    ids.add(r.id);
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      date: r.date,
      start: r.start,
      end: r.end,
      done: r.done,
      deleted: r.deleted,
      clock: r.clock,
      author: r.author,
      authorName: r.authorName,
      assignee: r.assignee,
    };
  });
  return {
    format: "calender-club",
    version: 1,
    club: { id: p.club.id, name: p.club.name, records },
  };
}
/** Lamport revision + device ID: deterministic whole-record merge. Tombstones travel with the snapshot. */
export function mergeClub(local: Club, incoming: Club): Club {
  if (local.id !== incoming.id)
    throw new Error("The snapshot belongs to a different club.");
  const records = new Map(local.records.map((r) => [r.id, r]));
  let changed = false;
  for (const r of incoming.records) {
    const previous = records.get(r.id);
    if (
      !previous ||
      r.clock > previous.clock ||
      (r.clock === previous.clock && r.author > previous.author)
    ) {
      records.set(r.id, r);
      changed = true;
    }
  }
  if (!changed) return local;
  return {
    ...local,
    records: [...records.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}
