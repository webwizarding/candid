"use client";

import { useSyncExternalStore } from "react";
import { toKey } from "@/lib/dates";
import { SERVER_TODAY } from "@/lib/seed";

// "Today" and "now" are read on the client only (the server renders a fixed
// date) and refresh every 30s so the now-line and relative times stay live.

let today = "";
let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  const t = Date.now();
  now = Math.floor(t / 30_000) * 30_000;
  today = toKey(new Date(t));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => {
    tick();
    listeners.forEach((l) => l());
  }, 30_000);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useToday(): string {
  return useSyncExternalStore(
    subscribe,
    () => (today || (tick(), today)),
    () => SERVER_TODAY,
  );
}

/** Epoch ms rounded to 30s; 0 during server rendering. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => (now || (tick(), now)),
    () => 0,
  );
}
