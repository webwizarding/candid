import { describe, expect, it } from "vitest";
import {
  notePath,
  resolveNote,
  wikiLinks,
  renameWikiLinks,
  noteTags,
  validateNotes,
  type Note,
} from "./notes";
import { exportVault, importVault } from "./note-files";
const n = (id: string, path: string, body = ""): Note => ({
  id,
  path,
  body,
  courseId: "",
  eventId: "",
  pinned: false,
  createdAt: "2026-10-28T10:00:00.000Z",
  updatedAt: "2026-10-28T10:00:00.000Z",
});
describe("local notes and Markdown interchange", () => {
  it("bounds and sanitizes portable note paths", () => {
    expect(notePath("Classes/Biology")).toBe("Classes/Biology.md");
    for (const path of [
      "../private.md",
      "/private.md",
      "C:\\secret.md",
      "Classes//note.md",
      "CON.md",
      "folder/.hidden.md",
      "",
    ])
      expect(() => notePath(path)).toThrow();
  });
  it("resolves local wiki links and keeps ambiguous names unresolved", () => {
    const notes = [
      n("a", "Biology/Lecture.md"),
      n("b", "Math/Lecture.md"),
      n("c", "Biology/Ideas.md"),
    ];
    expect(resolveNote(notes, "Lecture", "Biology/Ideas.md")?.id).toBe("a");
    expect(resolveNote(notes, "Lecture", "Inbox/Other.md")).toBeUndefined();
    expect(resolveNote(notes, "Math/Lecture")?.id).toBe("b");
    expect(
      wikiLinks(
        "[[Biology/Lecture|class]] and `[[ignore]]`\n```\n[[also ignored]]\n```",
      ),
    ).toEqual(["Biology/Lecture"]);
  });
  it("updates actual backlinks on rename without modifying code examples", () => {
    const notes = [n("a", "Biology/Lecture.md"), n("b", "Biology/Ideas.md")];
    expect(
      renameWikiLinks(
        "[[Lecture#Summary|Class]] `[[Lecture]]`",
        notes,
        notes[0],
        "Biology/Week 1.md",
        notes[1].path,
      ),
    ).toBe("[[Biology/Week 1#Summary|Class]] `[[Lecture]]`");
    expect(
      noteTags('---\ntags: [biology, "revision"]\n---\n#notes `#not-a-tag`'),
    ).toEqual(["notes", "biology", "revision"]);
  });
  it("round trips a vault as plain Markdown files", async () => {
    const notes = [
      n("a", "Classes/Biology.md", "# Biology\n\n[[Ideas]] #revision"),
      n("b", "Ideas.md", "A thought."),
    ];
    const imported = await importVault(exportVault(notes));
    expect(imported).toEqual(notes.map(({ path, body }) => ({ path, body })));
  });
  it("rejects duplicate active paths and excessive notes before a merge", () => {
    expect(() =>
      validateNotes([n("a", "Ideas.md"), n("b", "ideas.md")]),
    ).toThrow();
    expect(() =>
      validateNotes([n("a", "Ideas.md", "x".repeat(100001))]),
    ).toThrow();
    expect(
      validateNotes([
        { ...n("a", "Ideas.md"), deletedAt: "2026-10-28T11:00:00.000Z" },
        n("b", "Ideas.md"),
      ]),
    ).toHaveLength(2);
  });
});
