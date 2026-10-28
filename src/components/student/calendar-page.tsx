"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  PanelRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { Calendar } from "@/components/calendar/calendar";
import { useAppStore } from "@/stores/app-store";
import { useStudentStore } from "@/stores/student-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { openOverlay } from "@/stores/overlay-store";
import {
  addDays,
  formatShort,
  formatTimeRange,
  fromKey,
  startOfWeek,
  toKey,
} from "@/lib/dates";
import { useToday } from "@/hooks/use-today";
import { useVisibleEvents } from "@/hooks/use-visible-events";
import { Button } from "@/components/ui/button";

function addExamples() {
  const today = toKey(new Date());
  const monday = startOfWeek(today, 1);
  const id = () => crypto.randomUUID();
  useAppStore.getState().saveEvents([
    {
      id: id(),
      title: "Introduction to psychology",
      date: addDays(monday, 1),
      start: 540,
      end: 630,
      allDay: false,
      color: "purple",
      calendarId: "classes",
      kind: "class",
      location: "Lecture hall 204",
      note: "Example · bring your reading notes",
    },
    {
      id: id(),
      title: "Deep work · essay outline",
      date: today,
      start: 660,
      end: 750,
      allDay: false,
      color: "blue",
      calendarId: "study",
      kind: "study",
      note: "Example · one small step at a time",
    },
    {
      id: id(),
      title: "Calculus tutorial",
      date: addDays(monday, 3),
      start: 600,
      end: 660,
      allDay: false,
      color: "purple",
      calendarId: "classes",
      kind: "class",
      location: "Science building · Room 12",
    },
    {
      id: id(),
      title: "Library study session",
      date: addDays(monday, 4),
      start: 780,
      end: 900,
      allDay: false,
      color: "blue",
      calendarId: "study",
      kind: "study",
      location: "Library · quiet floor",
    },
    {
      id: id(),
      title: "A little time outside",
      date: today,
      start: 960,
      end: 1020,
      allDay: false,
      color: "green",
      calendarId: "personal",
      kind: "personal",
    },
  ]);
  useStudentStore.getState().saveAssignment({
    id: id(),
    title: "Psychology · reflection paper",
    courseId: "classes",
    due: addDays(today, 3),
    estimate: 90,
    priority: "normal",
    done: false,
    notes: "Example assignment. Edit or delete it to make this space your own.",
  });
}

export function DayAgenda() {
  const day = useCalendarStore((s) => s.date);
  const events = useVisibleEvents()
    .filter((e) => e.date === day)
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start);
  const timeFormat = useAppStore((s) => s.settings.timeFormat);
  return (
    <div className="day-agenda">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">
          {formatShort(day)}{" "}
          <span className="text-fg-2 font-normal">
            · {fromKey(day).toLocaleDateString("en", { weekday: "short" })}
          </span>
        </h2>
        <span className="text-xs text-fg-2">{events.length} events</span>
      </div>
      {!events.length ? (
        <div className="agenda-empty">
          <CalendarDays size={23} />
          <p>Room to make this day yours.</p>
          <button onClick={() => openOverlay({ kind: "event", date: day })}>
            Plan something <Plus size={13} />
          </button>
        </div>
      ) : (
        <div className="agenda-timeline">
          {events.map((e) => (
            <button
              key={e.id}
              className="agenda-event"
              onClick={() => openOverlay({ kind: "event", eventId: e.id })}
            >
              <span
                className="agenda-event-dot"
                style={{ background: `var(--event-${e.color}-fg)` }}
              />
              <span>
                <small>
                  {e.allDay
                    ? "All day"
                    : formatTimeRange(e.start, e.end, timeFormat)}
                </small>
                <strong>{e.title}</strong>
                {e.location && <small>{e.location}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CalendarPage() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const events = useAppStore((s) => s.events);
  const assignments = useStudentStore((s) => s.assignments);
  const today = useToday();
  const upcoming = assignments
    .filter((a) => !a.done)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 3);
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="page-heading calendar-page-heading">
        <div>
          <h1>
            Your calendar<span className="heading-dot">.</span>
          </h1>
          <p>Classes, deadlines, and a life beyond them.</p>
        </div>
        <Button
          className="context-toggle"
          aria-pressed={detailsOpen}
          aria-controls={detailsOpen ? "calendar-day-details" : undefined}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          <PanelRight /> Day details
        </Button>
      </div>
      {!events.length && (
        <div className="welcome-strip">
          <Sparkles size={18} />
          <span>
            <strong>A fresh start for your semester.</strong> Add your first
            class, or explore with a few example events.
          </span>
          <Button size="sm" onClick={addExamples}>
            Try examples
          </Button>
        </div>
      )}
      <div className="calendar-workspace">
        <div className="calendar-frame">
          <Calendar />
        </div>
        {detailsOpen && (
          <aside id="calendar-day-details" className="calendar-context">
            <DayAgenda />
            <section className="context-section">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold">On your radar</h2>
                <Link href="/assignments" aria-label="View all assignments">
                  <ChevronRight size={16} />
                </Link>
              </div>
              {upcoming.length ? (
                upcoming.map((a) => (
                  <Link
                    href={`/assignments#${a.id}`}
                    key={a.id}
                    className="radar-task"
                  >
                    <span
                      className={`deadline-badge ${a.due < today ? "overdue" : ""}`}
                    >
                      {a.due < today ? "Overdue" : formatShort(a.due)}
                    </span>
                    <strong>{a.title}</strong>
                    <small>{a.estimate} min estimated</small>
                  </Link>
                ))
              ) : (
                <p className="text-xs leading-relaxed text-fg-2">
                  No deadlines waiting. Add assignments to see what’s coming up.
                </p>
              )}
              <Link href="/assignments" className="subtle-link mt-4">
                <Plus size={13} /> Add an assignment
              </Link>
            </section>
            <section className="focus-invitation">
              <span className="eyebrow">ONE THING AT A TIME</span>
              <h3>Find your focus.</h3>
              <p>Give your next task 25 minutes of undivided attention.</p>
              <Link href="/focus">
                Start a focus session <ChevronRight size={14} />
              </Link>
              <span className="focus-art" aria-hidden>
                ✳
              </span>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
