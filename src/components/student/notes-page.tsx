"use client";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  Download,
  FileText,
  Folder,
  Link2,
  Pin,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useNotesStore } from "@/stores/notes-store";
import { useStudentStore } from "@/stores/student-store";
import { useAppStore } from "@/stores/app-store";
import { useStorageStatus } from "@/lib/local-storage";
import {
  type Note,
  noteTitle,
  noteTags,
  resolveNote,
  wikiLinks,
  NOTE_LIMIT,
} from "@/lib/notes";
import { downloadFile, readSmallFile } from "@/lib/files";
import { toKey } from "@/lib/dates";
import { MarkdownNote } from "./markdown-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/dialogs/field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function NoteEditor({
  note,
  onOpen,
  onBack,
}: {
  note: Note;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const [body, setBody] = useState(note.body),
    [path, setPath] = useState(note.path),
    [mode, setMode] = useState<"write" | "read">("write"),
    [pending, setPending] = useState(false);
  const current = useRef(note.body),
    saved = useRef(note.body);
  const notes = useNotesStore((s) => s.notes),
    courses = useStudentStore((s) => s.calendars),
    events = useAppStore((s) => s.events),
    storageError = useStorageStatus((s) => s.error);
  const commit = () => {
    if (current.current === saved.current) return;
    try {
      useNotesStore.getState().updateNote(note.id, { body: current.current });
      saved.current = current.current;
      setPending(false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  useEffect(() => {
    const timer = setTimeout(commit, 400);
    return () => clearTimeout(timer);
  }, [body]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const flush = () => {
      if (current.current !== saved.current) {
        try {
          useNotesStore
            .getState()
            .updateNote(note.id, { body: current.current });
          saved.current = current.current;
        } catch {}
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [note.id]);
  const openWiki = (target: string) => {
    commit();
    const match = resolveNote(
      useNotesStore.getState().notes,
      target,
      note.path,
    );
    if (match) onOpen(match.id);
    else {
      try {
        const folder = note.path.split("/").slice(0, -1).join("/");
        const raw = target.split("#")[0];
        const id = useNotesStore
          .getState()
          .createNote(raw.includes("/") || !folder ? raw : `${folder}/${raw}`);
        onOpen(id);
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
  };
  const backlinks = notes.filter(
    (n) =>
      !n.deletedAt &&
      n.id !== note.id &&
      wikiLinks(n.body).some(
        (link) => resolveNote(notes, link, n.path)?.id === note.id,
      ),
  );
  const rename = () => {
    commit();
    try {
      useNotesStore.getState().renameNote(note.id, path);
    } catch (e) {
      toast.error((e as Error).message);
      setPath(note.path);
    }
  };
  return (
    <section className="note-editor content-card">
      <div className="note-editor-heading">
        <button
          className="icon-button lg:hidden"
          aria-label="Back to notes list"
          onClick={() => {
            commit();
            onBack();
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <FileText size={19} className="shrink-0 text-brand" />
        <Input
          aria-label="Note path"
          value={path}
          maxLength={240}
          onChange={(e) => setPath(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className="min-w-0 flex-1 border-0 bg-transparent! text-base! font-semibold shadow-none!"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          onClick={() =>
            useNotesStore
              .getState()
              .updateNote(note.id, { pinned: !note.pinned })
          }
        >
          <Pin size={16} className={note.pinned ? "text-brand" : ""} />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Export this Markdown note"
          onClick={() => {
            commit();
            void downloadFile(
              note.path.split("/").at(-1)!,
              current.current,
              "text/markdown",
            );
          }}
        >
          <Download size={16} />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Move note to trash"
          onClick={() => {
            commit();
            useNotesStore.getState().trashNote(note.id);
            onBack();
            toast("Note moved to trash", {
              action: {
                label: "Undo",
                onClick: () => useNotesStore.getState().restoreNote(note.id),
              },
            });
          }}
        >
          <Trash2 size={16} />
        </Button>
      </div>
      <div className="note-context-row">
        <label className="flex min-w-0 items-center gap-2 text-xs text-fg-2">
          <BookOpen size={14} />
          <select
            aria-label="Note course"
            className="student-select max-w-44 py-1! text-xs!"
            value={note.courseId}
            onChange={(e) =>
              useNotesStore
                .getState()
                .updateNote(note.id, { courseId: e.target.value })
            }
          >
            <option value="">No course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs text-fg-2">
          <CalendarDays size={14} />
          <select
            aria-label="Linked calendar event"
            className="student-select max-w-48 py-1! text-xs!"
            value={note.eventId}
            onChange={(e) =>
              useNotesStore
                .getState()
                .updateNote(note.id, { eventId: e.target.value })
            }
          >
            <option value="">No linked meeting</option>
            {events
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 500)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.date} · {e.title}
                </option>
              ))}
          </select>
        </label>
        <div className="ml-auto flex gap-1" role="group" aria-label="Note mode">
          <Button
            size="sm"
            variant={mode === "write" ? "secondary" : "ghost"}
            aria-pressed={mode === "write"}
            onClick={() => setMode("write")}
          >
            Write
          </Button>
          <Button
            size="sm"
            variant={mode === "read" ? "secondary" : "ghost"}
            aria-pressed={mode === "read"}
            onClick={() => {
              commit();
              setMode("read");
            }}
          >
            Read
          </Button>
        </div>
      </div>
      {mode === "write" ? (
        <textarea
          className="note-writing"
          aria-label="Markdown note"
          placeholder="Start writing. Use # headings, - [ ] tasks, #tags and [[note links]]."
          value={body}
          maxLength={NOTE_LIMIT}
          onChange={(e) => {
            current.current = e.target.value;
            setBody(e.target.value);
            setPending(true);
          }}
          onBlur={commit}
        />
      ) : (
        <div className="note-reading">
          <MarkdownNote
            body={body || "*This note is empty.*"}
            onWiki={openWiki}
          />
        </div>
      )}
      <div className="note-footer">
        <span role="status">
          {storageError
            ? "Storage unavailable — export your notes"
            : pending
              ? "Saving…"
              : "Saved on this device"}
        </span>
        <span>{body.trim() ? body.trim().split(/\s+/).length : 0} words</span>
      </div>
      <details className="note-connections" open={mode === "read"}>
        <summary>
          <Link2 size={14} /> Connections{" "}
          <span className="text-fg-2">{backlinks.length} backlinks</span>
        </summary>
        <div className="grid gap-3 pt-3">
          <div className="flex flex-wrap gap-2">
            {noteTags(body).map((tag) => (
              <span className="note-tag" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {wikiLinks(body).map((link) => (
              <button
                className="note-tag text-brand"
                key={link}
                onClick={() => openWiki(link)}
              >
                [[{link}]]
              </button>
            ))}
          </div>
          {backlinks.length ? (
            <div className="grid gap-1">
              {backlinks.map((n) => (
                <button
                  className="text-left text-sm text-brand hover:underline"
                  key={n.id}
                  onClick={() => {
                    commit();
                    onOpen(n.id);
                  }}
                >
                  {noteTitle(n.path)}{" "}
                  <span className="text-xs text-fg-2">{n.path}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-fg-2">
              Link to this note from another note to see a backlink here.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
export function NotesPage() {
  const notes = useNotesStore((s) => s.notes);
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [folder, setFolder] = useState("all"),
    [tag, setTag] = useState(""),
    [trash, setTrash] = useState(false),
    [newOpen, setNewOpen] = useState(false),
    [newPath, setNewPath] = useState(""),
    [preview, setPreview] = useState<Array<{
      path: string;
      body: string;
    }> | null>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const read = () =>
      setSelected(decodeURIComponent(window.location.hash.slice(1)));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const open = (id: string) => {
    setSelected(id);
    window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  };
  const active = notes.filter((n) => !n.deletedAt),
    folders = [
      ...new Set(
        active
          .map((n) => n.path.split("/").slice(0, -1).join("/"))
          .filter(Boolean),
      ),
    ].sort(),
    tags = [...new Set(active.flatMap((n) => noteTags(n.body)))].sort();
  const filtered = notes
    .filter(
      (n) =>
        Boolean(n.deletedAt) === trash &&
        (folder === "all" || n.path.startsWith(folder + "/")) &&
        (!tag || noteTags(n.body).includes(tag)) &&
        `${n.path} ${n.body}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
  const note = notes.find((n) => n.id === selected && !n.deletedAt);
  const run = async (action: () => unknown) => {
    try {
      await action();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="notes-page scroll-page">
      <div className="page-heading">
        <div>
          <h1>
            Notes<span className="heading-dot">.</span>
          </h1>
          <p>A place for your classes, ideas, and everything between them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() =>
              void run(() => {
                const path = `Daily/${toKey(new Date())}.md`;
                const existing = active.find((n) => n.path === path);
                open(
                  existing?.id ||
                    useNotesStore
                      .getState()
                      .createNote(
                        path,
                        `# ${toKey(new Date())}\n\n## Today\n- [ ] \n\n## Notes\n`,
                      ),
                );
                setTrash(false);
              })
            }
          >
            <CalendarDays />
            Daily note
          </Button>
          <Button
            variant="brand"
            onClick={() => {
              setNewPath("");
              setNewOpen(true);
            }}
          >
            <Plus />
            New note
          </Button>
        </div>
      </div>
      <div className={`notes-workspace ${note ? "has-note" : ""}`}>
        <aside className="note-library content-card">
          <div className="note-library-toolbar">
            <label className="relative block">
              <Search size={15} className="absolute left-3 top-3 text-fg-2" />
              <Input
                aria-label="Search notes"
                placeholder="Search notes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="student-select text-xs!"
                aria-label="Note folder"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              >
                <option value="all">All folders</option>
                {folders.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <select
                className="student-select text-xs!"
                aria-label="Filter notes by tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs text-fg-2">
                {trash ? "Trash" : `${active.length} notes · private`}
              </span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={trash ? "Show active notes" : "Show note trash"}
                onClick={() => {
                  setTrash(!trash);
                  setSelected("");
                  setFolder("all");
                  setTag("");
                }}
              >
                <Trash2 size={14} />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Import Markdown or vault ZIP"
                onClick={() => file.current?.click()}
              >
                <Upload size={14} />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Export Markdown vault ZIP"
                disabled={!active.length}
                onClick={() =>
                  void run(async () => {
                    const { exportVault } = await import("@/lib/note-files");
                    const data = exportVault(active);
                    await downloadFile(
                      "candid-notes.zip",
                      new Blob([new Uint8Array(data)], {
                        type: "application/zip",
                      }),
                      "application/zip",
                    );
                  })
                }
              >
                <Download size={14} />
              </Button>
            </div>
          </div>
          <div className="note-list">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`note-list-item ${n.id === selected ? "active" : ""}`}
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => open(n.id)}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    {n.pinned && <Pin size={12} />}
                    <span className="truncate">{noteTitle(n.path)}</span>
                  </span>
                  <span className="block truncate text-xs text-fg-2">
                    {n.path.includes("/")
                      ? n.path.split("/").slice(0, -1).join("/")
                      : "Unfiled"}{" "}
                    ·{" "}
                    {new Date(n.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
                {trash && (
                  <Button
                    size="sm"
                    onClick={() =>
                      void run(() => {
                        useNotesStore.getState().restoreNote(n.id);
                      })
                    }
                  >
                    Restore
                  </Button>
                )}
              </div>
            ))}
            {!filtered.length && (
              <p className="p-5 text-sm leading-relaxed text-fg-2">
                {trash
                  ? "No notes in trash."
                  : query || tag
                    ? "No matching notes."
                    : "Your notes live here. Start with a daily note or import Markdown files."}
              </p>
            )}
          </div>
        </aside>
        {note && !trash ? (
          <NoteEditor
            key={`${note.id}:${note.path}`}
            note={note}
            onOpen={open}
            onBack={() => setSelected("")}
          />
        ) : (
          <section className="note-empty content-card">
            <div className="feature-icon">
              <FileText size={26} />
            </div>
            <h2>Your own space to think.</h2>
            <p>
              Write Markdown, connect ideas with [[links]], and keep lecture
              notes beside your calendar.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  setNewPath("Classes/Untitled.md");
                  setNewOpen(true);
                }}
              >
                <Plus />
                Create a note
              </Button>
              <Button onClick={() => file.current?.click()}>
                <Folder />
                Import notes
              </Button>
            </div>
            <p className="text-xs!">
              Markdown and ZIP import/export work with Obsidian vaults. There is
              no live vault sync or Obsidian plugin connection.
            </p>
          </section>
        )}
      </div>
      <input
        ref={file}
        type="file"
        multiple
        accept=".md,.markdown,.zip"
        className="sr-only"
        aria-label="Import note files"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          void run(async () => {
            if (files.length > 1000)
              throw new Error("Choose up to 1,000 notes.");
            const imported: Array<{ path: string; body: string }> = [];
            for (const f of files) {
              if (f.name.toLowerCase().endsWith(".zip")) {
                if (f.size > 10000000)
                  throw new Error("Choose a ZIP under 10 MB.");
                const { importVault } = await import("@/lib/note-files");
                imported.push(
                  ...(await importVault(new Uint8Array(await f.arrayBuffer()))),
                );
              } else
                imported.push({
                  path: f.name.replace(/\.markdown$/i, ".md"),
                  body: await readSmallFile(f, 400000),
                });
            }
            if (imported.length) setPreview(imported);
          });
        }}
      />
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>New note</DialogTitle>
          <DialogDescription>
            Use folders in the path to keep your notes organized.
          </DialogDescription>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => {
                const id = useNotesStore.getState().createNote(newPath);
                setNewOpen(false);
                setTrash(false);
                open(id);
              });
            }}
          >
            <Field label="Note name or path" htmlFor="new-note-path">
              <Input
                id="new-note-path"
                autoFocus
                placeholder="Classes/Biology.md"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                maxLength={240}
                required
              />
            </Field>
            <Button type="submit" variant="brand">
              Create note
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(preview)}
        onOpenChange={(v) => !v && setPreview(null)}
      >
        <DialogContent>
          <DialogTitle>Import {preview?.length} Markdown notes?</DialogTitle>
          <DialogDescription>
            Notes stay on this device. Existing files are kept; matching names
            receive a numbered suffix. Remote images are not loaded.
          </DialogDescription>
          <div className="max-h-48 overflow-auto text-sm text-fg-2">
            {preview?.slice(0, 30).map((n, i) => (
              <p key={i} className="truncate">
                {n.path}
              </p>
            ))}
          </div>
          <Button
            variant="brand"
            onClick={() =>
              void run(() => {
                useNotesStore.getState().importNotes(preview!);
                setPreview(null);
                setTrash(false);
                toast.success("Notes imported");
              })
            }
          >
            Import notes
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
