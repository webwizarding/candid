import { describe, expect, it } from "vitest";
import { eventLocation, noteParts, safeWebUrl } from "./event-location";
import { appleMapsUrl, googleMapsEmbedUrl } from "./maps";
describe("event locations and imported notes", () => {
  it("offers a meeting link instead of maps for virtual locations", () => {
    expect(
      eventLocation(
        "Zoom Online Meeting",
        "[Join lecture](https://example.zoom.us/j/123456789)",
      ),
    ).toEqual({
      virtual: true,
      physical: false,
      meeting: "https://example.zoom.us/j/123456789",
    });
    expect(eventLocation("Library, Campus Drive").physical).toBe(true);
    expect(eventLocation("https://meet.google.com/abc-defg-hij").physical).toBe(
      false,
    );
    expect(eventLocation("Virtual office hours").physical).toBe(false);
  });
  it("renders markdown as safe labelled links without exposing long URL text", () => {
    expect(
      noteParts("Read [course notes](https://example.edu/course?week=1) today"),
    ).toEqual([
      { text: "Read " },
      { text: "course notes", url: "https://example.edu/course?week=1" },
      { text: " today" },
    ]);
    expect(noteParts("https://example.edu/" + "x".repeat(1000))[0].text).toBe(
      "example.edu",
    );
    expect(safeWebUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeWebUrl("https://user:pass@example.edu")).toBeUndefined();
    expect(
      eventLocation("Online", "https://zoom.us.evil.example/j/1").meeting,
    ).toBeUndefined();
  });
  it("only sends the requested location in map URLs", () => {
    const embed = new URL(googleMapsEmbedUrl("Science & Library"));
    expect(embed.searchParams.get("q")).toBe("Science & Library");
    expect(embed.searchParams.get("output")).toBe("embed");
    expect(new URL(appleMapsUrl("Campus Hall")).hostname).toBe(
      "maps.apple.com",
    );
  });
});
