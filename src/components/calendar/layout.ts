import type { CalEvent } from "@/lib/types";

/** One hour of the time grid, in px (matches the Figma: lines every 64px). */
export const HOUR_HEIGHT = 64;
export const SNAP_MINUTES = 15;
export const MIN_EVENT_MINUTES = 15;

export const minutesToPx = (m: number) => (m / 60) * HOUR_HEIGHT;
export const pxToMinutes = (px: number) => (px / HOUR_HEIGHT) * 60;
export const snap = (m: number, step = SNAP_MINUTES) => Math.round(m / step) * step;
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export type PositionedEvent = { event: CalEvent; column: number; columns: number };

/**
 * Lays out overlapping timed events side by side. Events are grouped into
 * clusters of transitive overlap; each cluster is split into the fewest
 * columns that keep events from colliding.
 */
export function layoutDay(events: CalEvent[]): PositionedEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: PositionedEvent[] = [];
  let cluster: { event: CalEvent; column: number }[] = [];
  let clusterEnd = -1;
  let columnEnds: number[] = [];

  const flush = () => {
    const columns = columnEnds.length;
    for (const c of cluster) out.push({ ...c, columns });
    cluster = [];
    columnEnds = [];
  };

  for (const event of sorted) {
    if (event.start >= clusterEnd && cluster.length) flush();
    let column = columnEnds.findIndex((end) => end <= event.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(event.end);
    } else {
      columnEnds[column] = event.end;
    }
    cluster.push({ event, column });
    clusterEnd = Math.max(clusterEnd, event.end);
  }
  if (cluster.length) flush();
  return out;
}
