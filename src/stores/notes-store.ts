"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { localStorageAdapter, useStorageStatus } from "@/lib/local-storage";
import {
  type Note,
  notePath,
  renameWikiLinks,
  uniqueNotePath,
  validateNotes,
} from "@/lib/notes";
type NotesState = {
  notes: Note[];
  createNote: (
    path: string,
    body?: string,
    context?: { courseId?: string; eventId?: string },
  ) => string;
  updateNote: (
    id: string,
    patch: Partial<Pick<Note, "body" | "courseId" | "eventId" | "pinned">>,
  ) => void;
  renameNote: (id: string, path: string) => void;
  trashNote: (id: string) => void;
  restoreNote: (id: string) => void;
  importNotes: (notes: Array<{ path: string; body: string }>) => void;
  mergeNotes: (notes: Note[]) => void;
};
export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => {
      const save = (notes: Note[]) => set({ notes: validateNotes(notes) });
      return {
        notes: [],
        createNote: (raw, body = "", context = {}) => {
          const now = new Date().toISOString();
          const id = crypto.randomUUID();
          const path = uniqueNotePath(raw, get().notes);
          save([
            ...get().notes,
            {
              id,
              path,
              body,
              courseId: context.courseId || "",
              eventId: context.eventId || "",
              pinned: false,
              createdAt: now,
              updatedAt: now,
            },
          ]);
          return id;
        },
        updateNote: (id, patch) =>
          save(
            get().notes.map((n) =>
              n.id === id
                ? { ...n, ...patch, updatedAt: new Date().toISOString() }
                : n,
            ),
          ),
        renameNote: (id, raw) => {
          const all = get().notes;
          const note = all.find((n) => n.id === id);
          if (!note) return;
          const path = notePath(raw);
          if (
            all.some(
              (n) =>
                !n.deletedAt &&
                n.id !== id &&
                n.path.toLowerCase() === path.toLowerCase(),
            )
          )
            throw new Error("A note already uses that path.");
          save(
            all.map((n) => ({
              ...n,
              path: n.id === id ? path : n.path,
              body: renameWikiLinks(n.body, all, note, path, n.path),
              updatedAt: new Date().toISOString(),
            })),
          );
        },
        trashNote: (id) =>
          save(
            get().notes.map((n) =>
              n.id === id ? { ...n, deletedAt: new Date().toISOString() } : n,
            ),
          ),
        restoreNote: (id) => {
          const all = get().notes;
          const note = all.find((n) => n.id === id);
          if (note)
            save(
              all.map((n) =>
                n.id === id
                  ? {
                      ...n,
                      path: uniqueNotePath(n.path, all),
                      deletedAt: undefined,
                      updatedAt: new Date().toISOString(),
                    }
                  : n,
              ),
            );
        },
        importNotes: (incoming) => {
          let all = [...get().notes];
          const now = new Date().toISOString();
          for (const note of incoming)
            all = [
              ...all,
              {
                id: crypto.randomUUID(),
                path: uniqueNotePath(note.path, all),
                body: note.body,
                courseId: "",
                eventId: "",
                pinned: false,
                createdAt: now,
                updatedAt: now,
              },
            ];
          save(all);
        },
        mergeNotes: (incoming) =>
          save([
            ...new Map(
              [...get().notes, ...validateNotes(incoming)].map((n) => [
                n.id,
                n,
              ]),
            ).values(),
          ]),
      };
    },
    {
      name: "candid:notes:v1",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorageAdapter),
      partialize: (s) => ({ notes: s.notes }),
      merge: (persisted, current) =>
        persisted === undefined
          ? current
          : {
              ...current,
              notes: validateNotes((persisted as { notes: unknown }).notes),
            },
      onRehydrateStorage: () => (_, error) => {
        if (error)
          useStorageStatus.setState({
            error:
              "Saved notes could not be opened. Keep your backup files before making changes.",
          });
      },
    },
  ),
);
