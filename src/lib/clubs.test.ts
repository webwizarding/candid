import { describe, expect, it } from "vitest";
import {
  mergeClub,
  validateClubPacket,
  clubPacket,
  type Club,
  type ClubRecord,
} from "./clubs";
const record: ClubRecord = {
  id: "r1",
  type: "task",
  title: "Book a room",
  body: "",
  date: "2026-10-28",
  start: 0,
  end: 1440,
  done: false,
  deleted: false,
  clock: 1,
  author: "a",
  authorName: "Alex",
  assignee: "",
};
const club: Club = { id: "club", name: "Film Society", records: [record] };
describe("club snapshot merge", () => {
  it("merges concurrent edits deterministically in both directions", () => {
    const a = {
      ...club,
      records: [{ ...record, clock: 2, author: "a", title: "A" }],
    };
    const b = {
      ...club,
      records: [{ ...record, clock: 2, author: "b", title: "B" }],
    };
    expect(mergeClub(a, b)).toEqual(mergeClub(b, a));
    expect(mergeClub(a, b).records[0].title).toBe("B");
  });
  it("preserves offline additions from both peers", () => {
    const peer = { ...club, records: [{ ...record, id: "r2" }] };
    expect(mergeClub(club, peer).records).toHaveLength(2);
  });
  it("propagates deletion without resurrecting older snapshots", () => {
    const deleted = {
      ...club,
      records: [{ ...record, clock: 3, deleted: true }],
    };
    expect(mergeClub(deleted, club).records[0].deleted).toBe(true);
    expect(mergeClub(club, deleted).records[0].deleted).toBe(true);
  });
  it("returns the same object for an unchanged snapshot to prevent sync echoes", () => {
    expect(mergeClub(club, structuredClone(club))).toBe(club);
  });
  it("rejects a different club and malformed incoming records", () => {
    expect(() => mergeClub(club, { ...club, id: "other" })).toThrow();
    expect(() =>
      validateClubPacket(
        clubPacket({ ...club, records: [{ ...record, clock: -1 }] }),
      ),
    ).toThrow();
  });
  it("keeps only club data from a shared payload", () => {
    const packet = validateClubPacket({
      ...clubPacket(club),
      personal: "secret",
    });
    expect(packet).not.toHaveProperty("personal");
  });
});
