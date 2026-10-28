"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarSearchIcon, CheckIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/time-off/status-badge";
import { formatLong, formatTimeRange, relativeTime } from "@/lib/dates";
import { useNow, useToday } from "@/hooks/use-today";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { openOverlay } from "@/stores/overlay-store";

export function RequestDetailsDialog({ open, onClose, requestId }: { open: boolean; onClose: () => void; requestId?: string }) {
  const router = useRouter();
  const request = useAppStore((s) => s.requests.find((r) => r.id === requestId));
  const timeFormat = useAppStore((s) => s.settings.timeFormat);
  const setStatus = useAppStore((s) => s.setRequestStatus);
  const deleteRequest = useAppStore((s) => s.deleteRequest);
  const today = useToday();
  const now = useNow();
  const [confirming, setConfirming] = useState(false);

  if (!request) return null;
  const canCancel = request.status === "pending" || (request.status === "approved" && request.from >= today);

  const rows: [string, React.ReactNode][] = [
    ["Leave type", request.type],
    ["Duration", request.duration],
    ["From", formatLong(request.from)],
    ["To", formatLong(request.to)],
    ...(!request.allDay && request.start !== undefined && request.end !== undefined
      ? ([["Hours", formatTimeRange(request.start, request.end, timeFormat)]] as [string, React.ReactNode][])
      : []),
    ["Submitted", now ? relativeTime(request.submittedAt, now) : formatLong(request.submittedAt.slice(0, 10))],
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="gap-5 p-5 sm:max-w-[440px]">
          <DialogHeader className="gap-3">
            <StatusBadge status={request.status} className="self-start" />
            <DialogTitle className="t-16 leading-[1.3]">{request.notes}</DialogTitle>
            <DialogDescription className="sr-only">Leave request details</DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4">
                <dt className="t-14 text-fg-2">{k}</dt>
                <dd className="t-14 text-right text-table">{v}</dd>
              </div>
            ))}
          </dl>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                useCalendarStore.getState().setDate(request.from);
                onClose();
                router.push("/time-off");
              }}
            >
              <CalendarSearchIcon /> Show in calendar
            </Button>
            {request.status === "pending" && (
              <Button onClick={() => openOverlay({ kind: "request", requestId: request.id })}>
                <PencilIcon /> Edit
              </Button>
            )}
            {canCancel && (
              <Button
                onClick={() => {
                  setStatus(request.id, "cancelled");
                  onClose();
                }}
              >
                <XIcon /> Cancel request
              </Button>
            )}
            <Button variant="destructive" className="ml-auto" onClick={() => setConfirming(true)}>
              <Trash2Icon /> Delete
            </Button>
          </div>
          {request.status === "pending" && (
            <div className="-mx-5 -mb-5 flex items-center gap-2 border-t border-hairline bg-app px-5 py-3">
              <span className="t-12 flex-1 text-fg-2">Manager preview — simulate a decision</span>
              <Button size="sm" onClick={() => setStatus(request.id, "declined")}>
                <XIcon className="text-danger" /> Decline
              </Button>
              <Button size="sm" variant="brand" onClick={() => setStatus(request.id, "approved")}>
                <CheckIcon /> Approve
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="t-16">Delete this request?</AlertDialogTitle>
            <AlertDialogDescription className="t-14 leading-[1.4]">
              It will be removed from your history and its calendar events deleted. You can undo right after.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteRequest(request.id);
                onClose();
              }}
            >
              Delete request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
