import { describe, expect, it } from "vitest";
import { readTorInvite, TOR_INVITE_PREFIX } from "./tor-invite";
const now = 1_800_000_000_000;
const valid = {
  onion: "a".repeat(55) + "d.onion",
  key: btoa(String.fromCharCode(...new Uint8Array(32).fill(7))).replace(
    /=/g,
    "",
  ),
  clubId: "club",
  expires: now / 1000 + 600,
};
const code = (value: unknown) =>
  TOR_INVITE_PREFIX + Buffer.from(JSON.stringify(value)).toString("base64url");
describe("Tor invitations", () => {
  it("reads a self-contained invite without returning its secret", () => {
    expect(readTorInvite(code(valid), now)).toEqual({
      onion: valid.onion,
      clubId: "club",
      expires: valid.expires,
    });
  });
  it("rejects expired, extended, malformed and non-onion destinations", () => {
    for (const value of [
      { ...valid, expires: now / 1000 },
      { ...valid, expires: now / 1000 + 10000 },
      { ...valid, onion: "127.0.0.1" },
      { ...valid, onion: valid.onion + ".evil.example" },
      { ...valid, key: "123456" },
      { ...valid, proxy: "https://example.org" },
      { ...valid, clubId: "" },
    ]) {
      expect(() => readTorInvite(code(value), now)).toThrow();
    }
    expect(() =>
      readTorInvite("candid-tor-v1:" + "a".repeat(2100), now),
    ).toThrow();
    expect(() => readTorInvite("123456", now)).toThrow();
  });
});
