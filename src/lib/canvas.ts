import ICAL from "ical.js";
import { importIcs } from "./ical";
import { toKey } from "./dates";
import type { Assignment } from "./student";
export function normalizeCanvasFeed(raw: string) {
  const url = new URL(raw.trim().replace(/^webcal:/i, "https:"));
  if (
    url.protocol !== "https:" ||
    !(
      url.hostname.endsWith(".instructure.com") ||
      url.hostname === "canvas.ucsc.edu"
    ) ||
    url.username ||
    url.password ||
    url.port ||
    !url.pathname.startsWith("/feeds/calendars/") ||
    !url.pathname.endsWith(".ics")
  )
    throw new Error(
      "Use an HTTPS Canvas feed from *.instructure.com or canvas.ucsc.edu. For other university domains, import the downloaded .ics file.",
    );
  return url.toString();
}
export async function parseCanvasCalendar(text: string, anchor: string) {
  const { events, recurring } = importIcs(
    text.trimStart().replace(/^\uFEFF/, ""),
    anchor,
  );
  const root = new ICAL.Component(ICAL.parse(text));
  const assignments: Assignment[] = [];
  const assignmentEventIds = new Set<string>();
  for (const component of root.getAllSubcomponents("vevent")) {
    const item = new ICAL.Event(component);
    const url = String(component.getFirstPropertyValue("url") ?? "");
    if (!/assignment/i.test(item.uid) && !/\/assignments\/\d+/.test(url))
      continue;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(item.uid),
    );
    const id = `canvas-${Array.from(new Uint8Array(digest))
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")}`;
    const prefix = `ics-${encodeURIComponent(item.uid)}-`;
    const occurrence = events.find((e) => e.id.startsWith(prefix));
    if (!occurrence) continue;
    assignments.push({
      id,
      title: item.summary.slice(0, 200) || "Canvas assignment",
      due: toKey(item.startDate.toJSDate()),
      courseId: "canvas",
      estimate: 60,
      done: false,
      priority: "normal",
      notes: [item.description, url].filter(Boolean).join("\n").slice(0, 10000),
    });
    for (const event of events)
      if (event.id.startsWith(prefix)) assignmentEventIds.add(event.id);
  }
  return {
    events: events.map((e) => ({
      ...e,
      calendarId: "canvas",
      color: "orange" as const,
    })),
    assignments,
    assignmentEventIds,
    recurring,
  };
}
