import { setStorageResetting } from "./local-storage";
import { clearUndoHistory, useAppStore } from "@/stores/app-store";
import { useStudentStore } from "@/stores/student-store";
import { useClubStore } from "@/stores/club-store";
import { useNotesStore } from "@/stores/notes-store";
import { useSchedulingStore } from "@/stores/scheduling-store";

export const RESET_SIGNAL = "candid:reset:v1";
const owned = (key: string) =>
  key === "theme" || key.startsWith("calender:") || key.startsWith("candid:");

/** Clear only Candid's storage. Restore the original values if removal fails. */
export function clearAppStorage(local: Storage, session: Storage) {
  const targets = [local, session].map((storage) => ({
    storage,
    items: [] as Array<[string, string]>,
  }));
  setStorageResetting(true);
  try {
    for (const target of targets) {
      for (let index = 0; index < target.storage.length; index++) {
        const key = target.storage.key(index);
        if (!key || !owned(key)) continue;
        const value = target.storage.getItem(key);
        if (value !== null) target.items.push([key, value]);
      }
    }
    for (const { storage, items } of targets)
      for (const [key] of items) {
        storage.removeItem(key);
        if (storage.getItem(key) !== null) throw new Error("Removal failed");
      }
    // Other open Candid tabs also discard their old in-memory state.
    local.setItem(RESET_SIGNAL, crypto.randomUUID());
    local.removeItem(RESET_SIGNAL);
    if (local.getItem(RESET_SIGNAL) !== null) throw new Error("Removal failed");
  } catch {
    for (const { storage, items } of targets)
      for (const [key, value] of items) {
        try {
          storage.setItem(key, value);
        } catch {}
      }
    setStorageResetting(false);
    throw new Error(
      "Candid could not finish the reset. Keep the app open and export a backup before closing.",
    );
  }
}

/** Block late autosaves, discard undo/timer state, then load a fresh document. */
export function restartEmptyApp() {
  setStorageResetting(true);
  clearUndoHistory();
  useAppStore.setState(useAppStore.getInitialState(), true);
  useStudentStore.setState(useStudentStore.getInitialState(), true);
  useClubStore.setState(useClubStore.getInitialState(), true);
  useNotesStore.setState(useNotesStore.getInitialState(), true);
  useSchedulingStore.setState(useSchedulingStore.getInitialState(), true);
  window.location.replace(new URL("/", window.location.href).href);
}
