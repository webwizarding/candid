"use client";

import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { openOverlay } from "@/stores/overlay-store";

/**
 * Deletes a calendar event from the keyboard or popover. Events that belong
 * to a leave request are managed through the request instead.
 */
export function deleteCalendarEvent(id: string) {
  const event = useAppStore.getState().events.find((e) => e.id === id);
  if (!event) return;
  useCalendarStore.getState().closePopover();
  if (event.requestId) {
    const requestId = event.requestId;
    toast("This event belongs to a leave request", {
      description: "Cancel or delete the request to remove it.",
      action: { label: "View request", onClick: () => openOverlay({ kind: "request-details", requestId }) },
    });
    return;
  }
  useAppStore.getState().deleteEvent(id);
}
