"use client";

import { useState } from "react";
import { useOverlayStore, type Overlay } from "@/stores/overlay-store";
import { EventDialog } from "./event-dialog";
import { ShortcutsDialog } from "./info-dialogs";

type Kind = Exclude<Overlay["kind"], "none" | "search">;
type Latest = { [K in Kind]?: Extract<Overlay, { kind: K }> };

/**
 * Hosts every app-wide dialog. The last payload of each kind is kept around so
 * a dialog keeps its content while it animates out after closing.
 */
export function GlobalDialogs() {
  const overlay = useOverlayStore((s) => s.overlay);
  const close = useOverlayStore((s) => s.close);
  const [latest, setLatest] = useState<Latest>({});
  const [session, setSession] = useState(0);
  const [prev, setPrev] = useState<Overlay>(overlay);

  // Derive state during render (no effect): remember payloads and count opens.
  if (overlay !== prev) {
    setPrev(overlay);
    if (overlay.kind !== "none" && overlay.kind !== "search") {
      setLatest((l) => ({ ...l, [overlay.kind]: overlay }));
      setSession((n) => n + 1);
    }
  }

  const is = (k: Kind) => overlay.kind === k;

  return (
    <>
      <EventDialog
        open={is("event")}
        session={session}
        onClose={close}
        eventId={latest.event?.eventId}
        date={latest.event?.date}
        start={latest.event?.start}
        end={latest.event?.end}
        allDay={latest.event?.allDay}
      />
      <ShortcutsDialog open={is("shortcuts")} onClose={close} />
    </>
  );
}
