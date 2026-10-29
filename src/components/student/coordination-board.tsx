"use client";
import { useState } from "react";
import { Check, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { useClubStore } from "@/stores/club-store";
import { useNow } from "@/hooks/use-today";
import { type Club, type ClubRecord } from "@/lib/clubs";
import {
  coordBody,
  pollVotes,
  readCoordination,
  type Poll,
} from "@/lib/coordination";
import { toKey } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/dialogs/field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export const slotLabel = (slot: string, zone?: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(zone ? { timeZone: zone } : {}),
    timeZoneName: "short",
  }).format(new Date(slot));
export function PollCard({ club, record }: { club: Club; record: ClubRecord }) {
  const now = useNow();
  const device = useClubStore((s) => s.deviceId);
  const poll = readCoordination(record.body);
  if (poll?.kind !== "poll") return null;
  const votes = pollVotes(club.records, record.id, poll.options),
    own = votes.find((v) => v.author === device),
    mine = record.author === device;
  const vote = (option: string) => {
    if (!useClubStore.getState().deviceId)
      useClubStore.setState({ deviceId: crypto.randomUUID() });
    const state = useClubStore.getState();
    const existing = club.records.find(
      (r) =>
        !r.deleted &&
        r.author === state.deviceId &&
        readCoordination(r.body)?.kind === "vote" &&
        (readCoordination(r.body) as { pollId?: string }).pollId === record.id,
    );
    const choices = own?.choices.includes(option)
      ? own.choices.filter((c) => c !== option)
      : [...(own?.choices || []), option];
    state.saveRecord(club.id, {
      id: existing?.id || crypto.randomUUID(),
      type: "post",
      title: `Availability for ${record.title}`.slice(0, 200),
      body: coordBody({ kind: "vote", pollId: record.id, choices }),
      date: "",
      start: 0,
      end: 15,
      done: false,
      deleted: false,
      assignee: "",
    });
  };
  const choose = (option: string) => {
    if (new Date(option).getTime() < now) {
      toast.error("Choose a future meeting time.");
      return;
    }
    useClubStore.getState().saveRecord(club.id, {
      ...record,
      body: coordBody({ ...poll, chosen: option }),
    });
    const date = new Date(option),
      end = new Date(date.getTime() + poll.duration * 60000);
    if (toKey(date) !== toKey(end)) {
      toast(
        "The chosen time crosses midnight. Add it to the calendar manually.",
      );
      return;
    }
    useClubStore.getState().saveRecord(club.id, {
      id: `poll-event-${record.id}`,
      type: "event",
      title: record.title,
      body: poll.location,
      date: toKey(date),
      start: date.getHours() * 60 + date.getMinutes(),
      end: end.getHours() * 60 + end.getMinutes(),
      done: false,
      deleted: false,
      assignee: "",
    });
    toast.success("Meeting time chosen and added to club events");
  };
  return (
    <article className="coordination-card content-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow mb-1">
            {club.name} · {poll.duration} minutes
          </p>
          <h3 className="text-base font-semibold [overflow-wrap:anywhere]">
            {record.title}
          </h3>
          <p className="mt-1 text-xs text-fg-2">
            {votes.length} {votes.length === 1 ? "response" : "responses"} ·
            Select every time that works for you
          </p>
        </div>
        <Users size={18} className="shrink-0 text-brand" />
      </div>
      <div className="mt-4 grid gap-2">
        {poll.options.map((option) => {
          const count = votes.filter((v) => v.choices.includes(option)).length;
          return (
            <div
              className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline p-2"
              key={option}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(own?.choices.includes(option))}
                  disabled={
                    Boolean(poll.chosen) || new Date(option).getTime() < now
                  }
                  onChange={() => vote(option)}
                  aria-label={`Available ${slotLabel(option)}`}
                />
                <span className="min-w-0">{slotLabel(option)}</span>
              </label>
              <span className="note-tag">{count} available</span>
              {poll.chosen === option ? (
                <span className="flex items-center gap-1 text-xs font-medium text-brand">
                  <Check size={13} />
                  Chosen
                </span>
              ) : (
                mine &&
                !poll.chosen && (
                  <Button size="sm" onClick={() => choose(option)}>
                    Choose time
                  </Button>
                )
              )}
            </div>
          );
        })}
      </div>
      {votes.length > 0 && (
        <details className="mt-3 text-xs text-fg-2">
          <summary className="cursor-pointer">Responses</summary>
          <div className="mt-2 grid gap-1">
            {votes.map((v) => (
              <p key={v.author}>
                {v.name || "Student"} · {v.choices.length}{" "}
                {v.choices.length === 1 ? "time" : "times"}
              </p>
            ))}
          </div>
        </details>
      )}
      <p className="mt-3 text-xs leading-relaxed text-fg-2">
        Votes are shared with this club. Exchange a club file or connect in
        Clubs to receive other members’ responses. A chosen time is a club
        event; each member can copy it to their own calendar.
      </p>
    </article>
  );
}
export function CoordinationBoard({ compact = false }: { compact?: boolean }) {
  const clubs = useClubStore((s) => s.clubs);
  const [clubId, setClubId] = useState("");
  const club = clubs.find((c) => c.id === clubId) || clubs[0];
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Project check-in"),
    [duration, setDuration] = useState("30"),
    [location, setLocation] = useState(""),
    [options, setOptions] = useState(["", ""]);
  const polls =
    club?.records.filter(
      (r) => !r.deleted && readCoordination(r.body)?.kind === "poll",
    ) || [];
  const create = () => {
    try {
      if (!club) throw new Error("Create or join a club first.");
      const slots = options.filter(Boolean).map((value) => {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime()) || date.getTime() < Date.now())
          throw new Error("Choose future meeting times.");
        return date.toISOString();
      });
      const poll: Poll = {
        kind: "poll",
        options: [...new Set(slots)].sort(),
        duration: Number(duration),
        location,
        chosen: null,
      };
      if (!title.trim() || !readCoordination(coordBody(poll)))
        throw new Error(
          "Add a title and at least two different meeting times.",
        );
      useClubStore.getState().saveRecord(club.id, {
        id: crypto.randomUUID(),
        type: "post",
        title: title.trim(),
        body: coordBody(poll),
        date: "",
        start: 0,
        end: 15,
        done: false,
        deleted: false,
        assignee: "",
      });
      setOpen(false);
      toast.success("Meeting poll added to the club");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Find a time together</h2>
          <p className="mt-1 text-sm text-fg-2">
            Propose times, collect availability, and choose a meeting without
            sharing personal calendars.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="student-select max-w-48"
            aria-label="Coordination club"
            value={club?.id || ""}
            onChange={(e) => setClubId(e.target.value)}
          >
            {!clubs.length && <option value="">No clubs yet</option>}
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button
            variant="brand"
            disabled={!club}
            onClick={() => {
              setTitle("Project check-in");
              setOptions(["", ""]);
              setOpen(true);
            }}
          >
            <Plus />
            New meeting poll
          </Button>
        </div>
      </div>
      {!polls.length ? (
        <div className="content-card empty-state">
          <Users size={30} />
          <h3>
            {clubs.length
              ? "Less back and forth. More time together."
              : "Start with a club."}
          </h3>
          <p>
            {clubs.length
              ? "Create a poll for a project meeting, study group, or club gathering."
              : "Create or join a club in Clubs, then return here to coordinate a meeting."}
          </p>
        </div>
      ) : (
        <div className={compact ? "grid gap-4" : "grid gap-4 xl:grid-cols-2"}>
          {polls.map((r) => (
            <PollCard key={r.id} club={club!} record={r} />
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>New meeting poll</DialogTitle>
          <DialogDescription>
            Share these proposed times with {club?.name}. Your calendar and
            notes are not included.
          </DialogDescription>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <Field label="Meeting title" htmlFor="poll-title">
              <Input
                id="poll-title"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration" htmlFor="poll-duration">
                <select
                  id="poll-duration"
                  className="student-select"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location or meeting link" htmlFor="poll-location">
                <Input
                  id="poll-location"
                  maxLength={500}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-3">
              {options.map((value, i) => (
                <Field
                  key={i}
                  label={`Option ${i + 1}`}
                  htmlFor={`poll-option-${i}`}
                >
                  <Input
                    id={`poll-option-${i}`}
                    type="datetime-local"
                    required
                    value={value}
                    onChange={(e) =>
                      setOptions((all) =>
                        all.map((v, index) =>
                          index === i ? e.target.value : v,
                        ),
                      )
                    }
                  />
                </Field>
              ))}
            </div>
            <Button
              type="button"
              disabled={options.length >= 12}
              onClick={() => setOptions((v) => [...v, ""])}
            >
              <Plus />
              Add another time
            </Button>
            <p className="text-xs text-fg-2">
              Times use this device’s timezone and appear in each member’s local
              timezone.
            </p>
            <Button variant="brand" type="submit">
              Create poll
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
