"use client";
import { useState } from "react";
import {
  CalendarPlus,
  CheckCheck,
  CheckSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useStudentStore } from "@/stores/student-store";
import { useAppStore } from "@/stores/app-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { type Assignment, findStudySlot } from "@/lib/student";
import { formatShort, formatTimeRange, toKey } from "@/lib/dates";
import { useToday } from "@/hooks/use-today";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/dialogs/field";
import { useRouter } from "next/navigation";

export function planAssignment(assignment: Assignment) {
  const now = new Date();
  const minutes = Math.min(90, assignment.estimate);
  const slot = findStudySlot(
    useAppStore.getState().events,
    toKey(now),
    minutes,
    Math.max(480, now.getHours() * 60 + now.getMinutes() + 15),
  );
  if (!slot || slot.date > assignment.due) {
    toast.error("No free study block before this deadline", {
      description:
        "Add a block manually in the calendar, or adjust your schedule.",
    });
    return;
  }
  const course = useStudentStore
    .getState()
    .calendars.find((c) => c.id === assignment.courseId);
  const event = useAppStore.getState().saveEvent({
    ...slot,
    title: `Study · ${assignment.title}`,
    color: course?.color ?? "blue",
    calendarId: course?.id ?? "study",
    kind: "study",
    allDay: false,
    note: `For assignment: ${assignment.title}`,
    reminder: 10,
  });
  toast.success("Study block planned", {
    description: `${formatShort(slot.date)} · ${formatTimeRange(slot.start, slot.end)}`,
    action: {
      label: "View",
      onClick: () => {
        useCalendarStore.getState().setView("day");
        useCalendarStore.getState().focusEvent(event.id, event.date);
        window.location.hash = "";
      },
    },
  });
  return event;
}

export function AssignmentDialog({
  assignment,
  onClose,
}: {
  assignment: Assignment | null;
  onClose: () => void;
}) {
  const calendars = useStudentStore((s) => s.calendars);
  const [draft, setDraft] = useState<Assignment>(
    () =>
      assignment ?? {
        id: crypto.randomUUID(),
        title: "",
        due: toKey(new Date()),
        courseId: calendars[0]?.id ?? "",
        estimate: 60,
        priority: "normal",
        done: false,
        notes: "",
      },
  );
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogTitle>
          {assignment ? "Edit assignment" : "New assignment"}
        </DialogTitle>
        <DialogDescription>
          A clear deadline, and a manageable next step.
        </DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.title.trim()) return;
            useStudentStore
              .getState()
              .saveAssignment({ ...draft, title: draft.title.trim() });
            onClose();
          }}
        >
          <Field label="Assignment" htmlFor="assignment-title">
            <Input
              id="assignment-title"
              autoFocus
              required
              maxLength={200}
              placeholder="e.g. History essay · first draft"
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date" htmlFor="assignment-due">
              <Input
                id="assignment-due"
                type="date"
                required
                value={draft.due}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, due: e.target.value }))
                }
              />
            </Field>
            <Field label="Estimated minutes" htmlFor="assignment-estimate">
              <Input
                id="assignment-estimate"
                type="number"
                min={15}
                max={2400}
                step={15}
                required
                value={draft.estimate}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, estimate: Number(e.target.value) }))
                }
              />
            </Field>
          </div>
          <Field label="Course / calendar" htmlFor="assignment-course">
            <select
              id="assignment-course"
              className="student-select"
              value={draft.courseId}
              onChange={(e) =>
                setDraft((d) => ({ ...d, courseId: e.target.value }))
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.priority === "high"}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  priority: e.target.checked ? "high" : "normal",
                }))
              }
            />{" "}
            High priority
          </label>
          <Field label="Notes / next step" htmlFor="assignment-notes">
            <Textarea
              id="assignment-notes"
              rows={3}
              maxLength={10000}
              value={draft.notes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="brand" type="submit">
              Save assignment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AssignmentsPage() {
  const assignments = useStudentStore((s) => s.assignments);
  const calendars = useStudentStore((s) => s.calendars);
  const [filter, setFilter] = useState("open");
  const [course, setCourse] = useState("");
  const [dialog, setDialog] = useState<Assignment | "new" | null>(null);
  const today = useToday();
  const router = useRouter();
  const open = assignments.filter((a) => !a.done);
  const overdue = open.filter((a) => a.due < today);
  const shown = assignments
    .filter((a) => filter === "all" || (filter === "done" ? a.done : !a.done))
    .filter((a) => !course || a.courseId === course)
    .sort(
      (a, b) =>
        a.due.localeCompare(b.due) ||
        Number(b.priority === "high") - Number(a.priority === "high"),
    );
  return (
    <div className="scroll-page">
      <div className="page-heading">
        <div>
          <h1>
            Assignments<span className="heading-dot">.</span>
          </h1>
          <p>See what’s due. Make time to do it.</p>
        </div>
        <Button variant="brand" onClick={() => setDialog("new")}>
          <Plus /> New assignment
        </Button>
      </div>
      <div className="assignment-summary" aria-label="Assignment overview">
        <span>
          <strong>{open.length}</strong> to do
        </span>
        <span className={overdue.length ? "text-danger" : ""}>
          <strong>{overdue.length}</strong> overdue
        </span>
        <span>
          <strong>{assignments.filter((a) => a.done).length}</strong> completed
        </span>
      </div>
      <div className="content-card">
        <div className="list-toolbar">
          <div
            className="pill-tabs"
            role="group"
            aria-label="Assignment status"
          >
            {["open", "done", "all"].map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f === "open" ? "To do" : f === "done" ? "Completed" : "All"}
              </button>
            ))}
          </div>
          <select
            aria-label="Filter assignments by course"
            className="student-select w-auto max-w-[200px]"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="">All courses</option>
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {!shown.length ? (
          <div className="empty-state">
            <CheckSquare size={32} />
            <h2>
              {filter === "done"
                ? "Your progress will live here."
                : "A clear list. A clearer mind."}
            </h2>
            <p>
              {filter === "done"
                ? "Mark an assignment complete when it’s ready."
                : "Add your next deadline and break it into a study block."}
            </p>
            <Button onClick={() => setDialog("new")}>
              <Plus /> Add an assignment
            </Button>
          </div>
        ) : (
          <div className="assignment-list">
            {shown.map((a) => (
              <article key={a.id} id={a.id} className="assignment-row">
                <input
                  aria-label={`Mark ${a.title} ${a.done ? "incomplete" : "complete"}`}
                  type="checkbox"
                  checked={a.done}
                  onChange={() =>
                    useStudentStore.getState().toggleAssignment(a.id)
                  }
                />
                <div className="min-w-0 flex-1">
                  <button
                    className={`assignment-title ${a.done ? "line-through text-fg-2" : ""}`}
                    onClick={() => setDialog(a)}
                  >
                    {a.title}
                  </button>
                  <div className="assignment-meta">
                    <span
                      className={a.due < today && !a.done ? "text-danger" : ""}
                    >
                      {a.due < today && !a.done ? "Overdue · " : "Due "}
                      {formatShort(a.due)}
                    </span>
                    <span>
                      {calendars.find((c) => c.id === a.courseId)?.name ??
                        "Unsorted"}
                    </span>
                    <span>{a.estimate} min</span>
                    {a.priority === "high" && (
                      <span className="priority-tag">High priority</span>
                    )}
                  </div>
                  {a.notes && <p className="assignment-note">{a.notes}</p>}
                </div>
                <div className="row-actions">
                  {!a.done ? (
                    <button
                      className="icon-button"
                      title="Find and schedule up to 90 minutes of study time"
                      aria-label={`Plan study time for ${a.title}`}
                      onClick={() => {
                        const event = planAssignment(a);
                        if (event) {
                          useCalendarStore.getState().setDate(event.date);
                          router.push("/");
                        }
                      }}
                    >
                      <CalendarPlus size={17} />
                    </button>
                  ) : (
                    <CheckCheck size={17} className="text-brand" />
                  )}
                  <button
                    className="icon-button"
                    aria-label={`Edit ${a.title}`}
                    onClick={() => setDialog(a)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${a.title}`}
                    onClick={() => {
                      useStudentStore.getState().deleteAssignment(a.id);
                      toast("Assignment deleted", {
                        action: {
                          label: "Undo",
                          onClick: () =>
                            useStudentStore.getState().saveAssignment(a),
                        },
                      });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {dialog && (
        <AssignmentDialog
          key={dialog === "new" ? "new" : dialog.id}
          assignment={dialog === "new" ? null : dialog}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
