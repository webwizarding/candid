import { create } from "zustand";

let resetting = false;
export function setStorageResetting(value: boolean) {
  resetting = value;
}

export const useStorageStatus = create<{
  error: string | null;
  ready: boolean;
}>(() => ({ error: null, ready: false }));

/** A failed write keeps the in-memory edit and exposes a persistent warning. */
export const localStorageAdapter = {
  getItem(name: string) {
    try {
      return localStorage.getItem(name);
    } catch {
      useStorageStatus.setState({
        error:
          "Local storage is unavailable. Export a backup before closing the app.",
      });
      return null;
    }
  },
  setItem(name: string, value: string) {
    if (resetting) return;
    try {
      localStorage.setItem(name, value);
    } catch {
      useStorageStatus.setState({
        error:
          "Changes could not be saved to this device. Export a backup before closing the app.",
      });
    }
  },
  removeItem(name: string) {
    localStorage.removeItem(name);
  },
};
