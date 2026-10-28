"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { localStorageAdapter, useStorageStatus } from "@/lib/local-storage";
import {
  mergeClub,
  validateClubPacket,
  type Club,
  type ClubRecord,
} from "@/lib/clubs";

type ClubState = {
  deviceId: string;
  displayName: string;
  clubs: Club[];
  setDisplayName: (name: string) => void;
  createClub: (name: string) => string;
  saveRecord: (
    clubId: string,
    record: Omit<ClubRecord, "clock" | "author" | "authorName">,
  ) => void;
  mergePacket: (packet: unknown) => void;
};
export const useClubStore = create<ClubState>()(
  persist(
    (set, get) => ({
      deviceId: "",
      displayName: "Student",
      clubs: [],
      setDisplayName: (name) => set({ displayName: name.slice(0, 80) }),
      createClub: (name) => {
        const id = crypto.randomUUID();
        set((s) => ({
          clubs: [
            ...s.clubs,
            { id, name: name.trim().slice(0, 100), records: [] },
          ],
        }));
        return id;
      },
      saveRecord: (clubId, record) => {
        const state = get();
        const deviceId = state.deviceId || crypto.randomUUID();
        const club = state.clubs.find((c) => c.id === clubId);
        if (!club) return;
        const clock = Math.max(0, ...club.records.map((r) => r.clock)) + 1;
        const saved = {
          ...record,
          clock,
          author: deviceId,
          authorName: state.displayName.trim() || "Student",
        };
        set({
          deviceId,
          clubs: state.clubs.map((c) =>
            c.id === clubId
              ? {
                  ...c,
                  records: [
                    ...c.records.filter((r) => r.id !== saved.id),
                    saved,
                  ],
                }
              : c,
          ),
        });
      },
      mergePacket: (input) => {
        const { club } = validateClubPacket(input);
        set((s) => ({
          clubs: s.clubs.some((c) => c.id === club.id)
            ? s.clubs.map((c) => (c.id === club.id ? mergeClub(c, club) : c))
            : [...s.clubs, club],
        }));
      },
    }),
    {
      name: "calender:clubs:v1",
      version: 1,
      skipHydration: true,
      onRehydrateStorage: () => (_state, error) => {
        if (error)
          useStorageStatus.setState({
            error:
              "Saved planner data could not be opened. Keep your backups before making new changes.",
          });
      },
      storage: createJSONStorage(() => localStorageAdapter),
    },
  ),
);
