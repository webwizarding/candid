import type { ClubRecord } from "./clubs";
import { iso } from "./scheduling";
export const COORD_PREFIX = "candid-coordination-v1:";
export type Poll = {
  kind: "poll";
  options: string[];
  duration: number;
  location: string;
  chosen: string | null;
};
export type Vote = { kind: "vote"; pollId: string; choices: string[] };
export type Coordination = Poll | Vote;
export function readCoordination(body: string): Coordination | null {
  if (!body.startsWith(COORD_PREFIX) || body.length > 10000) return null;
  try {
    const v = JSON.parse(body.slice(COORD_PREFIX.length));
    if (
      v.kind === "poll" &&
      Array.isArray(v.options) &&
      v.options.length >= 2 &&
      v.options.length <= 12 &&
      v.options.every(iso) &&
      new Set(v.options).size === v.options.length &&
      Number.isInteger(v.duration) &&
      v.duration >= 15 &&
      v.duration <= 240 &&
      typeof v.location === "string" &&
      v.location.length <= 500 &&
      (v.chosen === null || v.options.includes(v.chosen))
    )
      return {
        kind: "poll",
        options: v.options,
        duration: v.duration,
        location: v.location,
        chosen: v.chosen,
      };
    if (
      v.kind === "vote" &&
      typeof v.pollId === "string" &&
      v.pollId.length <= 100 &&
      Array.isArray(v.choices) &&
      v.choices.length <= 12 &&
      v.choices.every(iso)
    )
      return {
        kind: "vote",
        pollId: v.pollId,
        choices: [...new Set(v.choices)],
      } as Vote;
  } catch {}
  return null;
}
export function pollVotes(
  records: ClubRecord[],
  pollId: string,
  options: string[],
) {
  const voters = new Map<
    string,
    {
      author: string;
      name: string;
      choices: string[];
      clock: number;
      id: string;
    }
  >();
  for (const record of records.filter((r) => !r.deleted && r.type === "post")) {
    const v = readCoordination(record.body);
    if (v?.kind !== "vote" || v.pollId !== pollId) continue;
    const prev = voters.get(record.author);
    if (
      !prev ||
      record.clock > prev.clock ||
      (record.clock === prev.clock && record.id > prev.id)
    )
      voters.set(record.author, {
        author: record.author,
        name: record.authorName,
        choices: v.choices.filter((c) => options.includes(c)),
        clock: record.clock,
        id: record.id,
      });
  }
  return [...voters.values()];
}
export const coordBody = (value: Coordination) =>
  COORD_PREFIX + JSON.stringify(value);
