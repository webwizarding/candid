"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. Servers (and the first hydration pass)
 * assume the desktop layout so markup matches; phones switch right after.
 * Prefer CSS breakpoints for layout — use this only when behaviour differs
 * (e.g. popover vs. bottom sheet).
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Phones and small tablets (< 768px, Tailwind's `md`). */
export const useIsMobile = () => useMediaQuery("(max-width: 767.98px)");

/** Below the desktop shell (< 1024px, Tailwind's `lg`): sidebar lives in a drawer. */
export const useIsCompactShell = () => useMediaQuery("(max-width: 1023.98px)");

/** Touch-first devices — no hover, coarse pointer. */
export const useIsTouch = () => useMediaQuery("(hover: none) and (pointer: coarse)");
