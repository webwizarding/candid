export type Note = {
  id: string;
  path: string;
  body: string;
  courseId: string;
  eventId: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};
export const NOTE_LIMIT = 100_000;
export const VAULT_LIMIT = 4_000_000;
export const noteTitle = (path: string) =>
  path.split("/").at(-1)!.replace(/\.md$/i, "");
export function notePath(raw: string) {
  const path = raw.trim().replace(/\\/g, "/").replace(/\.md$/i, "") + ".md";
  const parts = path.split("/");
  if (
    path.length > 240 ||
    parts.some(
      (p) =>
        !p.trim() ||
        p === "." ||
        p === ".." ||
        p.startsWith(".") ||
        /[<>:"|?*\u0000-\u001f]/.test(p) ||
        /[. ]$/.test(p) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p),
    ) ||
    noteTitle(path).trim() === ""
  )
    throw new Error("Use a relative note path, such as Classes/Biology.md.");
  return path;
}
export function validateNotes(value: unknown): Note[] {
  if (
    !Array.isArray(value) ||
    value.length > 1000 ||
    new TextEncoder().encode(JSON.stringify(value)).length > VAULT_LIMIT
  )
    throw new Error("The notes vault exceeds its 4 MB or 1,000-note limit.");
  const ids = new Set<string>();
  const paths = new Set<string>();
  return value.map((n: Note) => {
    if (
      !n ||
      typeof n.id !== "string" ||
      !n.id ||
      n.id.length > 100 ||
      ids.has(n.id) ||
      typeof n.path !== "string" ||
      typeof n.body !== "string" ||
      n.body.length > NOTE_LIMIT ||
      typeof n.courseId !== "string" ||
      n.courseId.length > 100 ||
      typeof n.eventId !== "string" ||
      n.eventId.length > 1000 ||
      typeof n.pinned !== "boolean" ||
      typeof n.createdAt !== "string" ||
      !Number.isFinite(Date.parse(n.createdAt)) ||
      typeof n.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(n.updatedAt)) ||
      (n.deletedAt !== undefined &&
        (typeof n.deletedAt !== "string" ||
          !Number.isFinite(Date.parse(n.deletedAt))))
    )
      throw new Error("Invalid note in the vault.");
    const path = notePath(n.path);
    const key = path.toLowerCase();
    if (!n.deletedAt && paths.has(key))
      throw new Error("Two active notes have the same path.");
    ids.add(n.id);
    if (!n.deletedAt) paths.add(key);
    return {
      id: n.id,
      path,
      body: n.body,
      courseId: n.courseId,
      eventId: n.eventId,
      pinned: n.pinned,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      ...(n.deletedAt ? { deletedAt: n.deletedAt } : {}),
    };
  });
}
function outsideCode(text: string, transform: (part: string) => string) {
  return text
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 ? part : transform(part)))
    .join("");
}
export function wikiLinks(body: string) {
  const links: string[] = [];
  outsideCode(body, (part) => {
    for (const match of part.matchAll(/\[\[([^\]\n]+)\]\]/g))
      links.push(match[1].split("|")[0].split("#")[0].trim());
    return part;
  });
  return [...new Set(links.filter(Boolean))];
}
export function resolveNote(
  notes: Note[],
  target: string,
  fromPath = "",
): Note | undefined {
  const plain = target
    .split("#")[0]
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "")
    .trim()
    .toLowerCase();
  const active = notes.filter((n) => !n.deletedAt);
  const parent = fromPath.split("/").slice(0, -1).join("/").toLowerCase();
  const candidates = [parent ? `${parent}/${plain}.md` : "", `${plain}.md`];
  for (const candidate of candidates) {
    const note = active.find((n) => n.path.toLowerCase() === candidate);
    if (note) return note;
  }
  const matches = active.filter(
    (n) => noteTitle(n.path).toLowerCase() === plain,
  );
  return matches.length === 1 ? matches[0] : undefined;
}
export function renameWikiLinks(
  body: string,
  notes: Note[],
  renamed: Note,
  nextPath: string,
  fromPath: string,
) {
  return outsideCode(body, (part) =>
    part.replace(/\[\[([^\]\n]+)\]\]/g, (whole, inner: string) => {
      const [target, ...alias] = inner.split("|");
      const [path, ...heading] = target.split("#");
      if (resolveNote(notes, path, fromPath)?.id !== renamed.id) return whole;
      return `[[${nextPath.replace(/\.md$/i, "")}${heading.length ? "#" + heading.join("#") : ""}${alias.length ? "|" + alias.join("|") : ""}]]`;
    }),
  );
}
export function noteTags(body: string) {
  let tags: string[] = [];
  outsideCode(body, (part) => {
    tags = [
      ...tags,
      ...Array.from(
        part.matchAll(/(?:^|\s)#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu),
        (m) => m[1].toLowerCase(),
      ),
    ];
    return part;
  });
  const front = body.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if (front) {
    const line = front[0].match(/^tags:\s*\[([^\]]*)\]/m);
    if (line)
      tags.push(
        ...line[1]
          .split(",")
          .map((t) =>
            t
              .trim()
              .replace(/^['"]|['"]$/g, "")
              .replace(/^#/, "")
              .toLowerCase(),
          )
          .filter(Boolean),
      );
  }
  return [...new Set(tags)];
}
export function wikiMarkdown(body: string) {
  return outsideCode(body, (part) =>
    part.replace(/\[\[([^\]\n]+)\]\]/g, (_, inner: string) => {
      const [target, alias] = inner.split("|");
      return `[${(alias || target).replace(/[\[\]]/g, "")}](candid-note:${encodeURIComponent(target)})`;
    }),
  );
}
export function uniqueNotePath(path: string, notes: Note[]) {
  const desired = notePath(path);
  let candidate = desired;
  let i = 2;
  while (
    notes.some(
      (n) => !n.deletedAt && n.path.toLowerCase() === candidate.toLowerCase(),
    )
  )
    candidate = desired.replace(/\.md$/i, ` ${i++}.md`);
  return candidate;
}
