import { describe, expect, it } from "vitest";
import { normalizeCanvasFeed, parseCanvasCalendar } from "./canvas";
import { googleMapsUrl } from "./maps";
describe("Canvas and location integration", () => {
  it("only permits direct fetches to hosted Canvas feed URLs", () => {
    expect(
      normalizeCanvasFeed(
        "webcal://school.instructure.com/feeds/calendars/user_test.ics",
      ),
    ).toBe("https://school.instructure.com/feeds/calendars/user_test.ics");
    for (const url of [
      "https://instructure.com.evil.example/feeds/calendars/x.ics",
      "https://127.0.0.1/feed.ics",
      "http://school.instructure.com/feeds/calendars/x.ics",
    ])
      expect(() => normalizeCanvasFeed(url)).toThrow();
  });
  it("accepts UCSC Canvas feed URLs and normalizes webcal links", () => {
    const expected = "https://canvas.ucsc.edu/feeds/calendars/user_test.ics";
    expect(normalizeCanvasFeed(expected)).toBe(expected);
    expect(normalizeCanvasFeed(expected.replace("https:", "webcal:"))).toBe(
      expected,
    );
  });
  it("rejects UCSC lookalikes and invalid feed URLs", () => {
    for (const url of [
      "https://canvas.ucsc.edu.evil.example/feeds/calendars/user_test.ics",
      "https://evilcanvas.ucsc.edu/feeds/calendars/user_test.ics",
      "https://canvas.ucsc.edu@evil.example/feeds/calendars/user_test.ics",
      "http://canvas.ucsc.edu/feeds/calendars/user_test.ics",
      "https://canvas.ucsc.edu:8443/feeds/calendars/user_test.ics",
      "https://user:pass@canvas.ucsc.edu/feeds/calendars/user_test.ics",
      "https://canvas.ucsc.edu/courses/user_test.ics",
    ])
      expect(() => normalizeCanvasFeed(url)).toThrow();
  });
  it("recognizes Canvas assignment deadlines with stable task IDs", async () => {
    const text =
      "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:assignment-123\r\nDTSTART:20261028T230000\r\nSUMMARY:Lab report\r\nURL:https://school.instructure.com/courses/1/assignments/123\r\nEND:VEVENT\r\nEND:VCALENDAR";
    const parsed = await parseCanvasCalendar(text, "2026-10-28");
    expect(parsed.assignments[0]).toMatchObject({
      title: "Lab report",
      due: "2026-10-28",
      courseId: "canvas",
    });
    expect(parsed.assignmentEventIds.has(parsed.events[0].id)).toBe(true);
    expect(
      (await parseCanvasCalendar(text, "2026-10-28")).assignments[0].id,
    ).toBe(parsed.assignments[0].id);
  });
  it("encodes location text into Google Maps URLs without a tracking key", () => {
    const search = new URL(googleMapsUrl("Science Hall & Library"));
    expect(search.hostname).toBe("www.google.com");
    expect(search.searchParams.get("query")).toBe("Science Hall & Library");
    const directions = new URL(googleMapsUrl("Campus Hall", true));
    expect(directions.searchParams.get("destination")).toBe("Campus Hall");
    expect(directions.searchParams.get("travelmode")).toBe("walking");
  });
});
