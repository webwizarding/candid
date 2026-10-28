import type { EventColor } from "@/lib/types";

export const EVENT_COLORS: EventColor[] = ["blue", "cyan", "green", "orange", "pink", "purple"];

/** Inline style for an event surface using the design's paired bg/fg tokens. */
export function eventStyle(color: EventColor): React.CSSProperties {
  return { background: `var(--event-${color}-bg)`, color: `var(--event-${color}-fg)` };
}
