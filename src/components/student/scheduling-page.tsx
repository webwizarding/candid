"use client";
import { useRef, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Download,
  FileUp,
  Link2,
  Plus,
  Settings2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { useSchedulingStore } from "@/stores/scheduling-store";
import { useAppStore } from "@/stores/app-store";
import { useStudentStore } from "@/stores/student-store";
import { useNotesStore } from "@/stores/notes-store";
import { useNow } from "@/hooks/use-today";
import { useRouter } from "next/navigation";
import { standaloneBookingPage } from "@/lib/booking-page";
import {
  type MeetingType,
  type Offer,
  type Booking,
  type AvailabilityDay,
  validateOffer,
  validateBooking,
  bookingIcs,
  offerCode,
  readOfferCode,
} from "@/lib/scheduling";
import { downloadFile, readSmallFile } from "@/lib/files";
import { toKey } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/dialogs/field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CoordinationBoard, slotLabel } from "./coordination-board";
const run = async (action: () => unknown) => {
  try {
    await action();
  } catch (e) {
    toast.error((e as Error).message);
  }
};
const minuteLabel = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const fromTime = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
};
const TEMPLATES = [
  {
    title: "Office hours",
    duration: 20,
    description:
      "Questions, feedback, and a little clarity before your next deadline.",
  },
  {
    title: "Study check-in",
    duration: 30,
    description:
      "Bring one topic or assignment you would like to work through together.",
  },
  {
    title: "Academic advising",
    duration: 30,
    description:
      "Plan courses, talk through your goals, and leave with a clear next step.",
  },
  {
    title: "Project meeting",
    duration: 45,
    description:
      "Align on the work, unblock each other, and agree on next steps.",
  },
];
function MeetingEditor({
  type,
  onClose,
}: {
  type: MeetingType;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(type);
  const courses = useStudentStore((s) => s.calendars);
  const update = (patch: Partial<MeetingType>) =>
    setDraft((v) => ({ ...v, ...patch }));
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-lg">
        <DialogTitle>
          {useSchedulingStore.getState().types.some((t) => t.id === type.id)
            ? "Edit meeting type"
            : "New meeting type"}
        </DialogTitle>
        <DialogDescription>
          Set this up once, then share available times whenever you need.
        </DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => {
              useSchedulingStore.getState().saveType(draft);
              onClose();
              toast.success("Meeting type saved");
            });
          }}
        >
          <Field label="Session name" htmlFor="meeting-title">
            <Input
              id="meeting-title"
              autoFocus
              required
              maxLength={120}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration" htmlFor="meeting-duration">
              <select
                className="student-select"
                id="meeting-duration"
                value={draft.duration}
                onChange={(e) => update({ duration: Number(e.target.value) })}
              >
                {[15, 20, 25, 30, 45, 50, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Calendar" htmlFor="meeting-course">
              <select
                className="student-select"
                id="meeting-course"
                value={draft.courseId}
                onChange={(e) => update({ courseId: e.target.value })}
              >
                <option value="">Personal</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label="Location or meeting link"
            htmlFor="meeting-location"
            hint="Only the location you enter is shared. Candid does not create video meeting links."
          >
            <Input
              id="meeting-location"
              placeholder="Library · Room 204, or your meeting URL"
              maxLength={500}
              value={draft.location}
              onChange={(e) => update({ location: e.target.value })}
            />
          </Field>
          <Field label="Description for guests" htmlFor="meeting-description">
            <Textarea
              id="meeting-description"
              maxLength={2000}
              rows={3}
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </Field>
          <details className="rounded-xl border border-hairline p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              Scheduling rules
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Buffer (minutes)" htmlFor="meeting-buffer">
                <Input
                  id="meeting-buffer"
                  type="number"
                  min={0}
                  max={120}
                  value={draft.buffer}
                  onChange={(e) => update({ buffer: Number(e.target.value) })}
                />
              </Field>
              <Field label="Minimum notice (hours)" htmlFor="meeting-notice">
                <Input
                  id="meeting-notice"
                  type="number"
                  min={0}
                  max={168}
                  value={draft.notice / 60}
                  onChange={(e) =>
                    update({ notice: Number(e.target.value) * 60 })
                  }
                />
              </Field>
              <Field label="Book ahead (days)" htmlFor="meeting-horizon">
                <Input
                  id="meeting-horizon"
                  type="number"
                  min={1}
                  max={30}
                  value={draft.horizon}
                  onChange={(e) => update({ horizon: Number(e.target.value) })}
                />
              </Field>
            </div>
          </details>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => update({ active: e.target.checked })}
            />
            Available for scheduling
          </label>
          <Button type="submit" variant="brand">
            Save meeting type
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function AvailabilityForm() {
  const host = useSchedulingStore((s) => s.host),
    availability = useSchedulingStore((s) => s.availability);
  const [name, setName] = useState(host),
    [days, setDays] = useState(availability);
  const update = (day: number, patch: Partial<AvailabilityDay>) =>
    setDays((all) => all.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="content-card p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">Your weekly availability</h2>
        <p className="mb-5 text-sm leading-relaxed text-fg-2">
          Set your usual hours. Classes, imported events, and all-day events
          automatically block these times, including hidden calendars.
        </p>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => {
              useSchedulingStore.getState().setAvailability(name.trim(), days);
              toast.success("Availability saved");
            });
          }}
        >
          <Field label="Your name for guests" htmlFor="scheduling-host">
            <Input
              id="scheduling-host"
              maxLength={100}
              placeholder="Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <div className="grid gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const d = days.find((d) => d.day === day)!;
              const label = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ][day];
              return (
                <div key={day} className="availability-row">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={(e) =>
                        update(day, { enabled: e.target.checked })
                      }
                    />
                    <span>{label}</span>
                  </label>
                  {d.enabled ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <Input
                        type="time"
                        aria-label={`${label} start`}
                        value={minuteLabel(d.start)}
                        onChange={(e) =>
                          update(day, { start: fromTime(e.target.value) })
                        }
                        required
                      />
                      <span className="text-xs text-fg-2">to</span>
                      <Input
                        type="time"
                        aria-label={`${label} end`}
                        value={minuteLabel(d.end)}
                        onChange={(e) =>
                          update(day, { end: fromTime(e.target.value) })
                        }
                        required
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-fg-2">Unavailable</span>
                  )}
                </div>
              );
            })}
          </div>
          <Button className="justify-self-start" type="submit" variant="brand">
            Save availability
          </Button>
        </form>
      </section>
      <aside className="content-card grid gap-3 p-5">
        <Clock3 size={21} className="text-brand" />
        <h3 className="font-semibold">A little breathing room.</h3>
        <p className="text-sm leading-relaxed text-fg-2">
          Buffers and minimum notice live in each meeting type’s settings.
          Shared schedules are snapshots; refresh them when your plans change.
        </p>
        <p className="text-xs leading-relaxed text-fg-2">
          Your schedule uses this device’s timezone. Guests can view offered
          times in theirs. Travelled to a different timezone? Share a fresh
          schedule.
        </p>
      </aside>
    </div>
  );
}
function ShareOffer({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const [showCode, setShowCode] = useState(false);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-lg">
        <DialogTitle>Share {offer.type.title}</DialogTitle>
        <DialogDescription>
          {offer.slots.length} free start times · {offer.type.duration} minutes
          · {offer.timezone}
        </DialogDescription>
        <div className="rounded-xl border border-hairline bg-app p-4 text-sm leading-relaxed text-fg-2">
          <p>
            Shared: your name, session description, location, and these free
            times.
          </p>
          <p className="mt-2">
            Calendar titles, busy-event details, assignments, and private notes
            are not included. This is a snapshot, not a live booking link.
            Guests return a request file for your approval.
          </p>
        </div>
        <Button
          variant="brand"
          onClick={() =>
            void downloadFile(
              "candid-booking-page.html",
              standaloneBookingPage(offer),
              "text/html",
            )
          }
        >
          <Download /> Save standalone booking page
        </Button>
        <p className="text-xs leading-relaxed text-fg-2">
          Guests can open this HTML file in a browser without Candid. It works
          offline and saves a request file for them to return to you.
        </p>
        <Button
          onClick={() =>
            void downloadFile(
              "candid-schedule.json",
              JSON.stringify(offer, null, 2),
            )
          }
        >
          <Download />
          Save scheduling file
        </Button>
        <Button
          onClick={() =>
            void navigator.clipboard
              .writeText(offerCode(offer))
              .then(() => toast.success("Scheduling code copied"))
              .catch(() => setShowCode(true))
          }
        >
          <Copy />
          Copy scheduling code
        </Button>
        <button
          className="text-left text-xs text-brand hover:underline"
          onClick={() => setShowCode(!showCode)}
        >
          Show code for manual copying
        </button>
        {showCode && (
          <Textarea
            aria-label="Scheduling invite code"
            readOnly
            value={offerCode(offer)}
            rows={4}
            onFocus={(e) => e.target.select()}
          />
        )}
        <p className="text-xs leading-relaxed text-fg-2">
          Send the file or complete code privately. The guest opens Scheduling →
          Open a schedule. Requests are confirmed only after you import and
          approve them.
        </p>
      </DialogContent>
    </Dialog>
  );
}
function GuestSchedule({
  offer,
  onClose,
}: {
  offer: Offer;
  onClose: () => void;
}) {
  const now = useNow();
  const [zone, setZone] = useState(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
    [slot, setSlot] = useState(""),
    [name, setName] = useState(""),
    [contact, setContact] = useState(""),
    [message, setMessage] = useState(""),
    [request, setRequest] = useState<Booking | null>(null);
  const upcoming = offer.slots.filter((s) => new Date(s).getTime() > now);
  const dayKey = (s: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(s));
  const dates = [...new Set(upcoming.map(dayKey))];
  const [chosenDay, setChosenDay] = useState("");
  const selectedDay = dates.includes(chosenDay) ? chosenDay : dates[0];
  const expired = offer.expires <= new Date().toISOString();
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle>
          {request ? "Your booking request is ready" : offer.type.title}
        </DialogTitle>
        <DialogDescription>
          {offer.host} · {offer.type.duration} minutes · Host timezone:{" "}
          {offer.timezone}
        </DialogDescription>
        {request ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-hairline bg-app p-5">
              <p className="font-medium">{slotLabel(request.slot, zone)}</p>
              <p className="mt-2 text-sm leading-relaxed text-fg-2">
                This is a request, not a confirmed booking. Send the file back
                to {offer.host}. They must import and approve it before it
                appears on their calendar. Candid does not send email or
                notifications to the host.
              </p>
            </div>
            <Button
              variant="brand"
              onClick={() =>
                void downloadFile(
                  "candid-booking-request.json",
                  JSON.stringify(request, null, 2),
                )
              }
            >
              <Download />
              Save booking request
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="grid content-start gap-3 rounded-xl bg-app p-4">
              <p className="text-sm leading-relaxed text-fg-2">
                {offer.type.description ||
                  "Pick a time and send a request to the host."}
              </p>
              {offer.type.location && (
                <p className="text-sm [overflow-wrap:anywhere]">
                  {offer.type.location}
                </p>
              )}
              <Field label="View times in" htmlFor="guest-timezone">
                <select
                  id="guest-timezone"
                  className="student-select text-xs!"
                  value={zone}
                  onChange={(e) => {
                    setZone(e.target.value);
                    setChosenDay("");
                    setSlot("");
                  }}
                >
                  {[
                    ...new Set([
                      zone,
                      offer.timezone,
                      "America/Los_Angeles",
                      "America/New_York",
                      "Europe/London",
                      "Europe/Paris",
                      "Asia/Kolkata",
                      "Asia/Shanghai",
                      "Asia/Tokyo",
                      "Australia/Sydney",
                      "UTC",
                    ]),
                  ].map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </Field>
              <p className="text-xs leading-relaxed text-fg-2">
                Snapshot expires {new Date(offer.expires).toLocaleDateString()}.
                Offered times may have changed; the host checks before
                confirming.
              </p>
            </aside>
            <div className="grid content-start gap-4">
              {expired || !upcoming.length ? (
                <p className="rounded-xl border border-hairline p-5 text-sm text-fg-2">
                  This schedule expired or has no future times. Ask the host to
                  share a fresh one.
                </p>
              ) : (
                <>
                  <div
                    className="flex max-h-36 flex-wrap gap-2 overflow-y-auto"
                    aria-label="Available days"
                  >
                    {dates.map((date) => (
                      <button
                        className={`schedule-day ${date === selectedDay ? "active" : ""}`}
                        aria-pressed={date === selectedDay}
                        key={date}
                        onClick={() => {
                          setChosenDay(date);
                          setSlot("");
                        }}
                      >
                        {date}
                      </button>
                    ))}
                  </div>
                  <div
                    className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3"
                    aria-label="Available start times"
                  >
                    {upcoming
                      .filter((s) => dayKey(s) === selectedDay)
                      .map((s) => (
                        <button
                          key={s}
                          className={`schedule-day ${slot === s ? "active" : ""}`}
                          aria-pressed={slot === s}
                          onClick={() => setSlot(s)}
                        >
                          {new Intl.DateTimeFormat(undefined, {
                            timeZone: zone,
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(s))}
                        </button>
                      ))}
                  </div>
                  {slot && (
                    <p className="text-sm font-medium" role="status">
                      Selected: {slotLabel(slot, zone)}
                    </p>
                  )}
                  <form
                    className="grid gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(() => {
                        if (offer.expires <= new Date().toISOString())
                          throw new Error(
                            "This schedule expired. Ask for fresh times.",
                          );
                        if (
                          !offer.slots.includes(slot) ||
                          new Date(slot).getTime() < now
                        )
                          throw new Error("Choose a future start time.");
                        setRequest(
                          validateBooking({
                            format: "candid-booking-request",
                            version: 1,
                            id: crypto.randomUUID(),
                            offerId: offer.id,
                            typeId: offer.type.id,
                            slot,
                            name,
                            contact,
                            message,
                            createdAt: new Date().toISOString(),
                            status: "pending",
                          }),
                        );
                      });
                    }}
                  >
                    <Field label="Your name" htmlFor="guest-name">
                      <Input
                        id="guest-name"
                        required
                        maxLength={100}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </Field>
                    <Field
                      label="How can the host reach you? (optional)"
                      htmlFor="guest-contact"
                    >
                      <Input
                        id="guest-contact"
                        placeholder="Email, campus chat, or another contact"
                        maxLength={200}
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                      />
                    </Field>
                    <Field
                      label="What would you like to discuss? (optional)"
                      htmlFor="guest-message"
                    >
                      <Textarea
                        id="guest-message"
                        maxLength={2000}
                        rows={2}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </Field>
                    <Button type="submit" variant="brand" disabled={!slot}>
                      Prepare booking request
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function SchedulingPage() {
  const state = useSchedulingStore();
  const now = useNow();
  const events = useAppStore((s) => s.events);
  const router = useRouter();
  const [tab, setTab] = useState("types"),
    [editor, setEditor] = useState<MeetingType | null>(null),
    [share, setShare] = useState<Offer | null>(null),
    [guest, setGuest] = useState<Offer | null>(null),
    [openCode, setOpenCode] = useState(false),
    [code, setCode] = useState(""),
    [bookingPreview, setBookingPreview] = useState<Booking | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const create = (template = TEMPLATES[0]) =>
    setEditor({
      id: crypto.randomUUID(),
      ...template,
      location: "",
      courseId: "",
      active: true,
      buffer: 10,
      notice: 60,
      horizon: 14,
    });
  const pending = state.bookings.filter((b) => b.status === "pending"),
    upcoming = state.bookings.filter(
      (b) => b.status === "confirmed" && new Date(b.slot).getTime() > now,
    );
  const makeNotes = (booking: Booking) => {
    const offer = state.offers.find((o) => o.id === booking.offerId);
    const existing = useNotesStore
      .getState()
      .notes.find((n) => !n.deletedAt && n.eventId === booking.eventId);
    const title = (offer?.type.title || "Meeting").replace(
      /[<>:"/\\|?*]/g,
      "-",
    );
    const id =
      existing?.id ||
      useNotesStore
        .getState()
        .createNote(
          `Meetings/${toKey(new Date(booking.slot))} ${title}.md`,
          `# ${offer?.type.title || "Meeting"}\n\n${slotLabel(booking.slot)}\nWith: ${booking.name}\n\n## Agenda\n- [ ] \n\n## Notes\n\n## Next steps\n- [ ] `,
          {
            eventId: booking.eventId,
            courseId: state.types.find((t) => t.id === booking.typeId)
              ?.courseId,
          },
        );
    router.push(`/notes#${id}`);
  };
  return (
    <div className="scroll-page scheduling-page">
      <div className="page-heading">
        <div>
          <h1>
            Scheduling<span className="heading-dot">.</span>
          </h1>
          <p>
            Office hours, study sessions, and getting everyone in the same room.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => file.current?.click()}>
            <FileUp />
            Import file
          </Button>
          <Button variant="brand" onClick={() => create()}>
            <Plus />
            New meeting type
          </Button>
        </div>
      </div>
      <div className="scheduling-overview">
        <div className="scheduling-stat">
          <span className="stat-icon">
            <CalendarDays size={18} />
          </span>
          <div>
            <span>Meeting types</span>
            <strong>{state.types.filter((t) => t.active).length}</strong>
          </div>
        </div>
        <div className="scheduling-stat">
          <span className="stat-icon">
            <Clock3 size={18} />
          </span>
          <div>
            <span>Awaiting your reply</span>
            <strong>{pending.length}</strong>
          </div>
        </div>
        <div className="scheduling-stat">
          <span className="stat-icon">
            <CalendarCheck size={18} />
          </span>
          <div>
            <span>Upcoming bookings</span>
            <strong>{upcoming.length}</strong>
          </div>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="workspace-tabs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <TabsList aria-label="Scheduling sections" className="max-w-full">
            <TabsTrigger value="types">Meeting types</TabsTrigger>
            <TabsTrigger value="bookings">
              Bookings{pending.length ? ` (${pending.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="coordination">Coordination</TabsTrigger>
          </TabsList>
          <Button
            size="sm"
            onClick={() => {
              setCode("");
              setOpenCode(true);
            }}
          >
            <Link2 />
            Open a schedule
          </Button>
        </div>
        <TabsContent value="types" className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm leading-relaxed text-fg-2">
              Set your availability once. Share a scheduling file, review
              requests, and confirm a time that works.
            </p>
            <Button size="sm" onClick={() => setTab("availability")}>
              <Settings2 />
              Set availability
            </Button>
          </div>
          {!state.types.length && (
            <section className="scheduling-welcome content-card">
              <div>
                <p className="eyebrow">MAKE TIME FOR WHAT MATTERS</p>
                <h2>Your next conversation starts here.</h2>
                <p>
                  Start with a session template. Your availability and calendar
                  take care of the free times.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {TEMPLATES.map((t) => (
                    <Button key={t.title} onClick={() => create(t)}>
                      <Plus />
                      {t.title}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="scheduling-welcome-art" aria-hidden>
                <div className="welcome-calendar">
                  <span>YOUR WEEK</span>
                  <div className="welcome-calendar-grid">
                    {Array.from({ length: 15 }, (_, i) => (
                      <span
                        key={i}
                        className={
                          [2, 5, 6, 10, 13].includes(i) ? "filled" : ""
                        }
                      />
                    ))}
                  </div>
                  <p>
                    <Check size={14} />A time that works.
                  </p>
                </div>
              </div>
            </section>
          )}
          <div className="meeting-types-grid">
            {state.types.map((type) => (
              <article key={type.id} className="meeting-type-card content-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="meeting-type-icon">
                    {type.location.startsWith("https:") ? (
                      <Video size={20} />
                    ) : (
                      <CalendarDays size={20} />
                    )}
                  </div>
                  <span
                    className={`note-tag ${type.active ? "text-brand" : ""}`}
                  >
                    {type.active ? "Active" : "Paused"}
                  </span>
                </div>
                <h2>{type.title}</h2>
                <p className="meeting-description">
                  {type.description || "A little time to connect."}
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-fg-2">
                  <span className="flex items-center gap-1">
                    <Clock3 size={13} />
                    {type.duration} minutes
                  </span>
                  <span>{type.buffer}m buffer</span>
                  <span>{type.horizon} days ahead</span>
                </div>
                <div className="meeting-type-actions">
                  <Button size="sm" onClick={() => setEditor(type)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="brand"
                    disabled={!type.active}
                    onClick={() =>
                      void run(() => {
                        if (!state.host.trim()) {
                          setTab("availability");
                          toast(
                            "Add your name and save your availability first.",
                          );
                          return;
                        }
                        const offer = useSchedulingStore
                          .getState()
                          .share(type.id);
                        setShare(offer);
                      })
                    }
                  >
                    <Link2 />
                    Share times
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {state.offers.length > 0 && (
            <p className="text-xs leading-relaxed text-fg-2">
              Shared schedules are snapshots, not live public links. Private
              calendar details and notes stay on this device. Re-share when your
              calendar changes.
            </p>
          )}
        </TabsContent>
        <TabsContent value="availability">
          <AvailabilityForm
            key={state.host + JSON.stringify(state.availability)}
          />
        </TabsContent>
        <TabsContent value="bookings">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your booking inbox</h2>
              <p className="mt-1 text-sm text-fg-2">
                Import returned request files. Every confirmation checks your
                current calendar and availability.
              </p>
            </div>
            <Button size="sm" onClick={() => file.current?.click()}>
              <FileUp />
              Import a request
            </Button>
          </div>
          {!state.bookings.length ? (
            <div className="content-card empty-state">
              <CalendarCheck size={32} />
              <h3>Room for your next conversation.</h3>
              <p>
                Share a meeting type. Returned requests will appear here for
                your approval.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {[...state.bookings]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((booking) => {
                  const offer = state.offers.find(
                      (o) => o.id === booking.offerId,
                    ),
                    event = events.find((e) => e.id === booking.eventId);
                  return (
                    <article
                      className="booking-row content-card"
                      key={booking.id}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {offer?.type.title || "Meeting"} · {booking.name}
                          </h3>
                          <span className="note-tag capitalize">
                            {booking.status}
                          </span>
                        </div>
                        <p className="text-sm text-fg-2">
                          {slotLabel(booking.slot)}
                        </p>
                        {booking.contact && (
                          <p className="mt-1 text-xs text-fg-2 [overflow-wrap:anywhere]">
                            {booking.contact}
                          </p>
                        )}
                        {booking.message && (
                          <p className="mt-2 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                            {booking.message}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {booking.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                void run(() =>
                                  state.setBookingStatus(
                                    booking.id,
                                    "declined",
                                  ),
                                )
                              }
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              variant="brand"
                              onClick={() =>
                                void run(() => {
                                  state.confirm(booking.id);
                                  toast.success(
                                    "Booking confirmed and added to your calendar",
                                  );
                                })
                              }
                            >
                              <Check />
                              Confirm
                            </Button>
                          </>
                        )}
                        {booking.status === "confirmed" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => void run(() => makeNotes(booking))}
                            >
                              Meeting notes
                            </Button>
                            <Button
                              size="sm"
                              disabled={!offer || !event}
                              onClick={() =>
                                offer &&
                                event &&
                                void downloadFile(
                                  "meeting.ics",
                                  bookingIcs(booking, offer),
                                  "text/calendar",
                                )
                              }
                            >
                              Calendar file
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void run(() => {
                                  state.setBookingStatus(
                                    booking.id,
                                    "cancelled",
                                  );
                                  toast(
                                    "Booking cancelled locally. Let the guest know separately.",
                                  );
                                })
                              }
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
          <p className="mt-4 text-xs leading-relaxed text-fg-2">
            Confirmations and cancellations are local. Send the calendar file or
            contact the guest yourself; no messages are sent automatically.
          </p>
        </TabsContent>
        <TabsContent value="coordination">
          <CoordinationBoard />
        </TabsContent>
      </Tabs>
      <input
        ref={file}
        type="file"
        accept=".json"
        className="sr-only"
        aria-label="Import scheduling file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          void run(async () => {
            const value = JSON.parse(await readSmallFile(f, 500000));
            if (value?.format === "candid-schedule")
              setGuest(validateOffer(value));
            else setBookingPreview(validateBooking(value));
          });
        }}
      />
      {editor && (
        <MeetingEditor type={editor} onClose={() => setEditor(null)} />
      )}{" "}
      {share && <ShareOffer offer={share} onClose={() => setShare(null)} />}{" "}
      {guest && (
        <GuestSchedule
          key={guest.id}
          offer={guest}
          onClose={() => setGuest(null)}
        />
      )}
      <Dialog open={openCode} onOpenChange={setOpenCode}>
        <DialogContent>
          <DialogTitle>Open a shared schedule</DialogTitle>
          <DialogDescription>
            Paste the complete code from your host, or import their scheduling
            file. No account is needed.
          </DialogDescription>
          <Textarea
            aria-label="Shared scheduling code"
            rows={4}
            value={code}
            maxLength={500000}
            onChange={(e) => setCode(e.target.value)}
            placeholder="candid-schedule-v1:…"
          />
          <Button
            variant="brand"
            disabled={!code.trim()}
            onClick={() =>
              void run(() => {
                setGuest(readOfferCode(code));
                setOpenCode(false);
                setCode("");
              })
            }
          >
            Open schedule
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(bookingPreview)}
        onOpenChange={(v) => !v && setBookingPreview(null)}
      >
        <DialogContent>
          <DialogTitle>Add this request to your inbox?</DialogTitle>
          <DialogDescription>
            The request will stay pending until you confirm it. Nothing is
            booked automatically.
          </DialogDescription>
          {bookingPreview && (
            <div className="rounded-xl bg-app p-4">
              <p className="font-medium">{bookingPreview.name}</p>
              <p className="mt-1 text-sm text-fg-2">
                {slotLabel(bookingPreview.slot)}
              </p>
              <p className="mt-2 text-sm [overflow-wrap:anywhere]">
                {bookingPreview.message}
              </p>
            </div>
          )}
          <Button
            variant="brand"
            onClick={() =>
              void run(() => {
                state.receive(bookingPreview);
                setBookingPreview(null);
                setTab("bookings");
                toast.success("Request added for review");
              })
            }
          >
            Add to booking inbox
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
