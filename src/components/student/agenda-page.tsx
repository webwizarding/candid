"use client";
import { useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { useVisibleEvents } from "@/hooks/use-visible-events";
import { useStudentStore } from "@/stores/student-store";
import { useAppStore } from "@/stores/app-store";
import { useToday } from "@/hooks/use-today";
import { addDays, formatLong, formatTimeRange } from "@/lib/dates";
import { openOverlay } from "@/stores/overlay-store";
import { Button } from "@/components/ui/button";
import { AssignmentDialog } from "./assignments-page";
import type { Assignment } from "@/lib/student";
export function AgendaPage() {
  const events = useVisibleEvents();
  const assignments = useStudentStore((s) => s.assignments);
  const today = useToday();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Assignment | null>(null);
  const format = useAppStore((s) => s.settings.timeFormat);
  const end = addDays(today, 30);
  const entries = [
    ...events
      .filter((e) => e.date >= today && e.date <= end)
      .map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        sub: e.allDay ? "All day" : formatTimeRange(e.start, e.end, format),
        sort: e.allDay ? -1 : e.start,
        color: e.color,
        open: () => openOverlay({ kind: "event", eventId: e.id }),
      })),
    ...assignments
      .filter((a) => !a.done && a.due <= end)
      .map((a) => ({
        id: a.id,
        date: a.due,
        title: a.title,
        sub: a.due < today ? "Overdue assignment" : "Assignment due",
        sort: 1440,
        color: "orange",
        open: () => setEditing(a),
      })),
  ]
    .filter((e) => e.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sort - b.sort);
  const days = [...new Set(entries.map((e) => e.date))];
  return (
    <div className="scroll-page">
      <div className="page-heading">
        <div>
          <h1>
            Your agenda<span className="heading-dot">.</span>
          </h1>
          <p>The next 30 days, with overdue assignments kept in sight.</p>
        </div>
        <Button
          variant="brand"
          onClick={() => openOverlay({ kind: "event", date: today })}
        >
          <Plus /> New event
        </Button>
      </div>
      <input
        className="agenda-search"
        aria-label="Filter agenda"
        placeholder="Find something in your agenda…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {!entries.length ? (
        <div className="content-card empty-state">
          <CalendarDays size={32} />
          <h2>
            {query ? "No matching plans." : "Your next chapter starts here."}
          </h2>
          <p>Add a class, an assignment, or something just for you.</p>
        </div>
      ) : (
        <div className="agenda-groups">
          {days.map((day) => (
            <section key={day}>
              <h2>
                {day === today ? "Today · " : ""}
                {formatLong(day)}
              </h2>
              <div className="content-card">
                {entries
                  .filter((e) => e.date === day)
                  .map((e) => (
                    <button
                      key={e.id}
                      className="agenda-list-item"
                      onClick={e.open}
                    >
                      <span
                        style={{ background: `var(--event-${e.color}-fg)` }}
                        className="size-2 rounded-full shrink-0"
                      />
                      <strong>{e.title}</strong>
                      <span>{e.sub}</span>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {editing && (
        <AssignmentDialog
          assignment={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
