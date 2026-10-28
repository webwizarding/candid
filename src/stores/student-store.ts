"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_CALENDARS,
  type Assignment,
  type CourseCalendar,
} from "@/lib/student";
import { localStorageAdapter, useStorageStatus } from "@/lib/local-storage";

type StudentState = {
  calendars: CourseCalendar[];
  assignments: Assignment[];
  focus: {
    until: number | null;
    remaining: number;
    duration: number;
    sessions: number;
    label: string;
  };
  addCalendar: (name: string, color: CourseCalendar["color"]) => void;
  toggleCalendar: (id: string) => void;
  saveAssignment: (assignment: Assignment) => void;
  deleteAssignment: (id: string) => void;
  toggleAssignment: (id: string) => void;
  setFocus: (patch: Partial<StudentState["focus"]>) => void;
};
export const useStudentStore = create<StudentState>()(
  persist(
    (set) => ({
      calendars: DEFAULT_CALENDARS,
      assignments: [],
      focus: {
        until: null,
        remaining: 25 * 60,
        duration: 25,
        sessions: 0,
        label: "",
      },
      addCalendar: (name, color) =>
        set((s) => ({
          calendars: [
            ...s.calendars,
            {
              id: crypto.randomUUID(),
              name: name.trim(),
              color,
              hidden: false,
            },
          ],
        })),
      toggleCalendar: (id) =>
        set((s) => ({
          calendars: s.calendars.map((c) =>
            c.id === id ? { ...c, hidden: !c.hidden } : c,
          ),
        })),
      saveAssignment: (assignment) =>
        set((s) => ({
          assignments: s.assignments.some((a) => a.id === assignment.id)
            ? s.assignments.map((a) =>
                a.id === assignment.id ? assignment : a,
              )
            : [...s.assignments, assignment],
        })),
      deleteAssignment: (id) =>
        set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) })),
      toggleAssignment: (id) =>
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.id === id ? { ...a, done: !a.done } : a,
          ),
        })),
      setFocus: (patch) => set((s) => ({ focus: { ...s.focus, ...patch } })),
    }),
    {
      name: "calender:student:v1",
      version: 1,
      storage: createJSONStorage(() => localStorageAdapter),
      skipHydration: true,
      onRehydrateStorage: () => (_state, error) => {
        if (error)
          useStorageStatus.setState({
            error:
              "Saved assignments could not be opened. Keep your backups before making new changes.",
          });
      },
    },
  ),
);
