"use client";

import { useState } from "react";
import { CopyIcon, Trash2Icon } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EVENT_COLORS } from "@/components/calendar/event-colors";
import { parseTime, timeInputValue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CalEvent, EventColor } from "@/lib/types";
import { useAppStore } from "@/stores/app-store";
import { MapLinks } from "@/components/student/map-links";
import { Field } from "./field";
import { useStudentStore } from "@/stores/student-store";
import { addDays, dayOfWeek, toKey } from "@/lib/dates";
import { conflicts, repeatDates } from "@/lib/student";
import { toast } from "sonner";

type Props = {
  open: boolean;
  session: number;
  onClose: () => void;
  eventId?: string;
  date?: string;
  start?: number;
  end?: number;
  allDay?: boolean;
};

export function EventDialog({ open, session, onClose, ...payload }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto gap-5 p-5 sm:max-w-[480px]">
        <EventForm key={session} {...payload} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

type Draft = Omit<CalEvent, "id">;

function EventForm({
  eventId,
  date,
  start,
  end,
  allDay,
  onDone,
}: Omit<Props, "open" | "session" | "onClose"> & { onDone: () => void }) {
  const existing = useAppStore((s) => s.events.find((e) => e.id === eventId));
  const calendars = useStudentStore((s) => s.calendars);
  const events = useAppStore((s) => s.events);
  const [deleteAll, setDeleteAll] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [until, setUntil] = useState(
    addDays(date ?? existing?.date ?? toKey(new Date()), 90),
  );
  const [repeatDays, setRepeatDays] = useState<number[]>([
    dayOfWeek(date ?? existing?.date ?? toKey(new Date())),
  ]);
  const saveEvent = useAppStore((s) => s.saveEvent);
  const deleteEvent = useAppStore((s) => s.deleteEvent);
  const duplicateEvent = useAppStore((s) => s.duplicateEvent);

  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? { ...existing }
      : {
          title: "",
          date: date ?? toKey(new Date()),
          start: start ?? 540,
          end: end ?? (start ?? 540) + 60,
          allDay: allDay ?? false,
          color: calendars[0]?.color ?? "blue",
          calendarId: calendars[0]?.id,
          kind: "class",
          reminder: 10,
          note: "",
          location: "",
        },
  );
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const error =
    !draft.allDay && draft.end <= draft.start
      ? "End time must be after the start time."
      : null;
  const overlaps = conflicts({ ...draft, id: existing?.id ?? "" }, events);
  let repeatError: string | null = null;
  if (repeating) {
    try {
      repeatDates(draft.date, until, repeatDays);
    } catch (e) {
      repeatError = (e as Error).message;
    }
  }
  const linked = Boolean(existing?.requestId);

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (error || !draft.title.trim() || !draft.date) return;
        const saved = {
          ...draft,
          title: draft.title.trim(),
          start: draft.allDay ? 0 : draft.start,
          end: draft.allDay ? 1440 : draft.end,
        };
        if (repeating) {
          if (repeatError) return;
          const seriesId = crypto.randomUUID();
          const dates = repeatDates(draft.date, until, repeatDays);
          useAppStore.getState().saveEvents(
            dates.map((day) => ({
              ...saved,
              id: crypto.randomUUID(),
              date: day,
              seriesId,
            })),
          );
          toast.success(`${dates.length} events added`);
        } else saveEvent({ ...saved, id: existing?.id });
        onDone();
      }}
    >
      <DialogHeader className="gap-1.5">
        <DialogTitle className="t-16">
          {existing ? "Edit event" : "New event"}
        </DialogTitle>
        <DialogDescription className="t-14">
          {linked
            ? "This event belongs to a leave request."
            : existing?.seriesId
              ? "Editing this occurrence. Other dates stay as scheduled."
              : "Saved on this device. No account or cloud required."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <Field label="Title" htmlFor="ev-title">
          <Input
            id="ev-title"
            maxLength={1000}
            autoFocus
            required
            placeholder="e.g. Biology lecture or exam revision"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-[1.4fr_1fr_1fr] items-end gap-3 max-sm:grid-cols-2 max-sm:[&>*:first-child]:col-span-2">
          <Field label="Date" htmlFor="ev-date">
            <Input
              id="ev-date"
              type="date"
              required
              value={draft.date}
              onChange={(e) => {
                set("date", e.target.value);
                if (!repeating && e.target.value)
                  setRepeatDays([dayOfWeek(e.target.value)]);
              }}
            />
          </Field>
          <Field label="Start" htmlFor="ev-start">
            <Input
              id="ev-start"
              type="time"
              step={900}
              disabled={draft.allDay}
              value={timeInputValue(draft.start)}
              onChange={(e) => {
                const next = parseTime(e.target.value);
                const length = draft.end - draft.start;
                setDraft((d) => ({
                  ...d,
                  start: next,
                  end: Math.min(1440, next + Math.max(15, length)),
                }));
              }}
            />
          </Field>
          <Field label="End" htmlFor="ev-end">
            <Input
              id="ev-end"
              type="time"
              step={900}
              disabled={draft.allDay}
              value={timeInputValue(draft.end)}
              onChange={(e) => set("end", parseTime(e.target.value) || 1440)}
            />
          </Field>
        </div>
        {error && (
          <p className="t-12 -mt-2 text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <Switch
              checked={draft.allDay}
              onCheckedChange={(v) => set("allDay", v)}
            />
            <span className="t-14 text-fg">All day</span>
          </label>
          <div
            className="flex items-center gap-1.5"
            role="group"
            aria-label="Color"
          >
            {EVENT_COLORS.map((c) => (
              <ColorSwatch
                key={c}
                color={c}
                selected={draft.color === c}
                onSelect={() => set("color", c)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Calendar" htmlFor="ev-calendar">
            <select
              className="student-select"
              id="ev-calendar"
              value={draft.calendarId ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  calendarId: e.target.value,
                  color:
                    calendars.find((c) => c.id === e.target.value)?.color ??
                    d.color,
                }))
              }
            >
              <option value="">Unsorted</option>
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type" htmlFor="ev-kind">
            <select
              className="student-select"
              id="ev-kind"
              value={draft.kind ?? "personal"}
              onChange={(e) => set("kind", e.target.value as Draft["kind"])}
            >
              <option value="class">Class</option>
              <option value="study">Study block</option>
              <option value="exam">Exam</option>
              <option value="personal">Personal</option>
            </select>
          </Field>
        </div>
        {overlaps.length > 0 && (
          <p className="text-sm text-fg-2" role="status">
            Overlaps with {overlaps.map((e) => e.title).join(", ")}. You can
            still save it.
          </p>
        )}
        {!existing && (
          <div className="grid gap-3 rounded-lg border border-hairline p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={repeating}
                onChange={(e) => setRepeating(e.target.checked)}
              />{" "}
              Repeat weekly
            </label>
            {repeating && (
              <>
                <div
                  className="flex flex-wrap gap-1"
                  role="group"
                  aria-label="Repeat on weekdays"
                >
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day, i) => (
                      <button
                        type="button"
                        key={day}
                        aria-pressed={repeatDays.includes(i)}
                        className={`weekday-button ${repeatDays.includes(i) ? "active" : ""}`}
                        onClick={() =>
                          setRepeatDays((days) =>
                            days.includes(i)
                              ? days.filter((d) => d !== i)
                              : [...days, i],
                          )
                        }
                      >
                        {day}
                      </button>
                    ),
                  )}
                </div>
                <Field label="Repeat until" htmlFor="ev-until">
                  <Input
                    type="date"
                    id="ev-until"
                    min={draft.date}
                    max={addDays(draft.date, 366)}
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                  />
                </Field>
                {repeatError && (
                  <p role="alert" className="text-sm text-danger">
                    {repeatError}
                  </p>
                )}
              </>
            )}
          </div>
        )}
        {!draft.allDay && (
          <Field
            label="In-app reminder"
            htmlFor="ev-reminder"
            hint="Shows while the app is open. No background notifications."
          >
            <select
              className="student-select"
              id="ev-reminder"
              value={draft.reminder ?? -1}
              onChange={(e) => set("reminder", Number(e.target.value))}
            >
              <option value={-1}>None</option>
              <option value={0}>At start</option>
              <option value={5}>5 minutes before</option>
              <option value={10}>10 minutes before</option>
              <option value={30}>30 minutes before</option>
            </select>
          </Field>
        )}

        <Field label="Location" htmlFor="ev-location">
          <Input
            id="ev-location"
            maxLength={2000}
            placeholder="Add a place or a link"
            value={draft.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
          />
        </Field>

        {draft.location?.trim() && <MapLinks location={draft.location} />}
        {existing?.seriesId && (
          <label className="flex items-center gap-2 text-xs text-fg-2">
            <input
              type="checkbox"
              checked={deleteAll}
              onChange={(e) => setDeleteAll(e.target.checked)}
            />{" "}
            Delete all{" "}
            {events.filter((e) => e.seriesId === existing.seriesId).length}{" "}
            dates when deleting this series
          </label>
        )}
        <Field
          label="Notes"
          htmlFor="ev-note"
          hint="Notes appear in the event details."
        >
          <Textarea
            id="ev-note"
            maxLength={10000}
            rows={2}
            value={draft.note ?? ""}
            onChange={(e) => set("note", e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter className="-mx-5 -mb-5 items-center bg-app px-5 py-3 sm:justify-between">
        <div className="flex gap-1">
          {existing && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete event"
                    onClick={() => {
                      if (deleteAll && existing.seriesId)
                        useAppStore.getState().deleteSeries(existing.seriesId);
                      else deleteEvent(existing.id);
                      onDone();
                    }}
                  >
                    <Trash2Icon className="text-danger" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Duplicate event"
                    onClick={() => {
                      duplicateEvent(existing.id);
                      onDone();
                    }}
                  >
                    <CopyIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicate</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={onDone}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="brand"
            disabled={
              !!error || !!repeatError || !draft.title.trim() || !draft.date
            }
          >
            {existing ? "Save" : "Create event"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function ColorSwatch({
  color,
  selected,
  onSelect,
}: {
  color: EventColor;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={color}
      onClick={onSelect}
      className={cn(
        "press size-5 rounded-full outline-none ring-offset-2 ring-offset-surface focus-visible:ring-2 focus-visible:ring-brand/50",
        selected && "ring-2",
      )}
      style={{
        background: `var(--event-${color}-bg)`,
        boxShadow: `inset 0 0 0 1.5px var(--event-${color}-fg)`,
        ...(selected
          ? ({
              "--tw-ring-color": `var(--event-${color}-fg)`,
            } as React.CSSProperties)
          : {}),
      }}
    />
  );
}
