import { describe, expect, it } from "vitest";
import { coordBody, readCoordination, pollVotes } from "./coordination";
import { mergeClub, validateClubPacket, type ClubRecord } from "./clubs";
const options = ["2026-11-01T10:00:00.000Z", "2026-11-02T10:00:00.000Z"];
const post = (
  id: string,
  author: string,
  clock: number,
  body: string,
): ClubRecord => ({
  id,
  author,
  clock,
  authorName: author,
  type: "post",
  title: "Meeting poll",
  body,
  date: "",
  start: 0,
  end: 15,
  done: false,
  deleted: false,
  assignee: "",
});
describe("peer-shared academic coordination", () => {
  it("stores polls and one latest vote per peer in ordinary club packets", () => {
    const poll = post(
      "poll",
      "host",
      1,
      coordBody({
        kind: "poll",
        options,
        duration: 30,
        location: "Library",
        chosen: null,
      }),
    );
    const a = post(
      "vote-a",
      "student",
      2,
      coordBody({ kind: "vote", pollId: "poll", choices: [options[0]] }),
    );
    const b = post(
      "vote-b",
      "student",
      3,
      coordBody({ kind: "vote", pollId: "poll", choices: options }),
    );
    const host = { id: "club", name: "Study group", records: [poll, a] },
      peer = { ...host, records: [poll, b] };
    const merged = mergeClub(
      host,
      validateClubPacket({ format: "calender-club", version: 1, club: peer })
        .club,
    );
    expect(pollVotes(merged.records, "poll", options)).toHaveLength(1);
    expect(pollVotes(merged.records, "poll", options)[0].choices).toEqual(
      options,
    );
    expect(mergeClub(host, peer)).toEqual(mergeClub(peer, host));
  });
  it("refuses malformed or oversized structured posts", () => {
    expect(readCoordination("regular club update")).toBeNull();
    expect(
      readCoordination(
        coordBody({
          kind: "poll",
          options: ["bad", "bad"],
          duration: 30,
          location: "",
          chosen: null,
        }),
      ),
    ).toBeNull();
  });
});
