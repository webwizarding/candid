"use client";

import { useMemo, useState } from "react";
import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatLong, parseTime, timeInputValue } from "@/lib/dates";
import { computeLeaveStats, formatDays, LEAVE_COLORS, LEAVE_TYPES } from "@/lib/leave";
import type { LeaveRequest, LeaveType } from "@/lib/types";
import { useToday } from "@/hooks/use-today";
import { useAppStore, type RequestInput } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { Field } from "./field";

type Props = { open: boolean; session: number; onClose: () => void; requestId?: string; from?: string };

export function RequestDialog({ open, session, onClose, requestId, from }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="gap-5 p-5 sm:max-w-[460px]">
        {/* Keyed by open-session so the form starts fresh every time */}
        <RequestForm key={session} requestId={requestId} from={from} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function initialInput(existing: LeaveRequest | undefined, from: string): RequestInput {
  if (existing) {
    return {
      type: existing.type,
      from: existing.from,
      to: existing.to,
      allDay: existing.allDay,
      start: existing.start ?? 540,
      end: existing.end ?? 1020,
      notes: existing.notes,
    };
  }
  return { type: "Time off", from, to: from, allDay: true, start: 540, end: 780, notes: "" };
}

function RequestForm({ requestId, from, onDone }: { requestId?: string; from?: string; onDone: () => void }) {
  const today = useToday();
  const calendarDate = useCalendarStore((s) => s.date);
  const requests = useAppStore((s) => s.requests);
  const settings = useAppStore((s) => s.settings);
  const holidays = useAppStore((s) => s.holidays);
  const measure = useAppStore((s) => s.measureRequest);
  const submit = useAppStore((s) => s.submitRequest);
  const existing = requests.find((r) => r.id === requestId);

  const [form, setForm] = useState<RequestInput>(() =>
    initialInput(existing, from ?? (calendarDate >= today ? calendarDate : today)),
  );
  const set = <K extends keyof RequestInput>(k: K, v: RequestInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const stats = useMemo(
    () => computeLeaveStats({ requests: requests.filter((r) => r.id !== requestId), settings, holidays }, today),
    [requests, requestId, settings, holidays, today],
  );
  const measured = measure(form);

  const error =
    form.allDay && form.to < form.from
      ? "End date must be on or after the start date."
      : !form.allDay && form.end <= form.start
        ? "End time must be after the start time."
        : form.allDay && measured.days === 0
          ? "These dates fall on weekends or holidays — nothing to request."
          : null;
  const remaining = stats.available - measured.days;

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (error) return;
        submit(form, requestId);
        onDone();
      }}
    >
      <DialogHeader className="gap-1.5">
        <DialogTitle className="t-16">{existing ? "Edit request" : "Request time-off"}</DialogTitle>
        <DialogDescription className="t-14">
          {existing ? "Changes are sent back to your manager for approval." : "Your manager is notified as soon as you submit."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <Field label="Leave type" htmlFor="rq-type">
          <Select value={form.type} onValueChange={(v) => set("type", v as LeaveType)}>
            <SelectTrigger id="rq-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAVE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  <span className="size-2 rounded-full" style={{ background: `var(--event-${LEAVE_COLORS[t]}-fg)` }} />
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-control bg-app px-3 py-2.5">
          <span className="grid gap-1">
            <span className="t-14 text-fg">Full days</span>
            <span className="t-12 text-fg-2">Turn off to request a few hours on one day</span>
          </span>
          <Switch checked={form.allDay} onCheckedChange={(v) => set("allDay", v)} />
        </label>

        {form.allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="rq-from">
              <Input
                id="rq-from"
                type="date"
                required
                value={form.from}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, from: v, to: f.to < v ? v : f.to }));
                }}
              />
            </Field>
            <Field label="To" htmlFor="rq-to">
              <Input id="rq-to" type="date" required min={form.from} value={form.to} onChange={(e) => set("to", e.target.value)} />
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3 max-sm:grid-cols-2 max-sm:[&>*:first-child]:col-span-2">
            <Field label="Date" htmlFor="rq-date">
              <Input id="rq-date" type="date" required value={form.from} onChange={(e) => set("from", e.target.value)} />
            </Field>
            <Field label="From" htmlFor="rq-start">
              <Input
                id="rq-start"
                type="time"
                step={900}
                value={timeInputValue(form.start)}
                onChange={(e) => set("start", parseTime(e.target.value))}
              />
            </Field>
            <Field label="To" htmlFor="rq-end">
              <Input
                id="rq-end"
                type="time"
                step={900}
                value={timeInputValue(form.end)}
                onChange={(e) => set("end", parseTime(e.target.value))}
              />
            </Field>
          </div>
        )}

        <Field label="Notes" htmlFor="rq-notes">
          <Textarea
            id="rq-notes"
            rows={3}
            placeholder="Add context for your manager (optional)"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline">
          <div className="grid gap-2 bg-app px-3 py-2.5">
            <span className="t-12 text-fg-2">Duration</span>
            <span className="t-14 text-fg">{error ? "—" : measured.label}</span>
          </div>
          <div className="grid gap-2 bg-app px-3 py-2.5">
            <span className="t-12 text-fg-2">Balance after request</span>
            <span className={remaining < 0 ? "t-14 text-danger" : "t-14 text-fg"}>
              {formatDays(Math.max(remaining, -99))} {Math.abs(remaining) === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {error ? (
          <p className="t-12 flex items-center gap-1.5 text-danger" role="alert">
            <AlertTriangleIcon className="size-3.5" /> {error}
          </p>
        ) : remaining < 0 ? (
          <p className="t-12 flex items-center gap-1.5 text-warning">
            <AlertTriangleIcon className="size-3.5" /> This exceeds your balance — it may be unpaid leave.
          </p>
        ) : form.allDay && form.from !== form.to ? (
          <p className="t-12 text-fg-2">
            {formatLong(form.from)} – {formatLong(form.to)} · weekends and public holidays aren’t counted.
          </p>
        ) : null}
      </div>

      <DialogFooter className="-mx-5 -mb-5 bg-app px-5 py-3">
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={!!error}>
          {existing ? "Save changes" : "Submit request"}
        </Button>
      </DialogFooter>
    </form>
  );
}
