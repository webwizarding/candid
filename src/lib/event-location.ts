/** Plain text and links only: imported notes are never interpreted as HTML. */
export type NotePart = { text: string; url?: string };
export function safeWebUrl(raw: string): string | undefined {
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.href;
  } catch {
    /* Imported text need not be a URL. */
  }
}
export function noteParts(text: string): NotePart[] {
  const pattern =
    /\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)|(https:\/\/[^\s<>\[\]]+)/g;
  const parts: NotePart[] = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > offset)
      parts.push({ text: text.slice(offset, match.index) });
    const raw = (match[2] || match[3]).replace(/[.,;]+$/, "");
    const url = safeWebUrl(raw);
    parts.push({ text: match[1] || (url ? new URL(url).hostname : raw), url });
    offset = match.index! + match[0].length;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset) });
  return parts;
}
export function eventLocation(location: string, notes = "") {
  const links = noteParts(`${location}\n${notes}`).flatMap((p) =>
    p.url ? [p.url] : [],
  );
  const meeting = links.find((link) => {
    const host = new URL(link).hostname;
    return (
      host === "zoom.us" ||
      host.endsWith(".zoom.us") ||
      host === "meet.google.com" ||
      host === "teams.microsoft.com" ||
      host === "teams.live.com" ||
      host.endsWith(".webex.com")
    );
  });
  const virtual =
    /\b(zoom|online|virtual|remote|google meet|microsoft teams|webex)\b/i.test(
      location,
    ) || Boolean(safeWebUrl(location.trim()));
  return { virtual, meeting, physical: Boolean(location.trim()) && !virtual };
}
