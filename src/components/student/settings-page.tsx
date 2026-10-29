"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CanvasImport } from "./canvas-import";
import { useRef, useState } from "react";
import {
  Download,
  FileUp,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { useStudentStore } from "@/stores/student-store";
import { useNotesStore } from "@/stores/notes-store";
import { useSchedulingStore } from "@/stores/scheduling-store";
import { validateNotes } from "@/lib/notes";
import { validateScheduling } from "@/lib/scheduling";
import { useClubStore } from "@/stores/club-store";
import { decodeBackup, encryptBackup, type PlannerBackup } from "@/lib/backup";
import { downloadFile, readSmallFile } from "@/lib/files";
import { toKey } from "@/lib/dates";
import type { CalEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/dialogs/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type Preview =
  | { kind: "backup"; backup: PlannerBackup }
  | { kind: "ics"; events: CalEvent[]; recurring: boolean };
export function StudentSettings() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const calendars = useStudentStore((s) => s.calendars);
  const { resolvedTheme, setTheme } = useTheme();
  const [password, setPassword] = useState("");
  const [encrypted, setEncrypted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const snapshot = (): PlannerBackup => ({
    format: "calender-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    events: useAppStore.getState().events,
    calendars: useStudentStore.getState().calendars,
    assignments: useStudentStore.getState().assignments,
    settings: useAppStore.getState().settings,
    clubs: useClubStore.getState().clubs,
    notes: useNotesStore.getState().notes,
    scheduling: {
      host: useSchedulingStore.getState().host,
      availability: useSchedulingStore.getState().availability,
      types: useSchedulingStore.getState().types,
      offers: useSchedulingStore.getState().offers,
      bookings: useSchedulingStore.getState().bookings,
    },
  });
  const exportBackup = async () => {
    setBusy(true);
    try {
      const value = snapshot();
      const saved = await downloadFile(
        `candid-${toKey(new Date())}${encrypted ? ".candid" : ".json"}`,
        encrypted
          ? await encryptBackup(value, password)
          : JSON.stringify(value, null, 2),
      );
      if (!saved) return;
      toast.success("Backup prepared", {
        description:
          "Keep the file somewhere safe. Encrypted backups need your password to open.",
      });
      setPassword("");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const merge = () => {
    if (!preview) return;
    try {
      if (preview.kind === "ics")
        useAppStore.getState().saveEvents(preview.events);
      else {
        const backup = preview.backup;
        const mergedNotes = backup.notes
          ? validateNotes([
              ...new Map(
                [...useNotesStore.getState().notes, ...backup.notes].map(
                  (n) => [n.id, n],
                ),
              ).values(),
            ])
          : undefined;
        const currentScheduling = useSchedulingStore.getState();
        const mergedScheduling = backup.scheduling
          ? validateScheduling({
              ...backup.scheduling,
              types: [
                ...new Map(
                  [...currentScheduling.types, ...backup.scheduling.types].map(
                    (n) => [n.id, n],
                  ),
                ).values(),
              ],
              offers: [
                ...new Map(
                  [
                    ...currentScheduling.offers,
                    ...backup.scheduling.offers,
                  ].map((n) => [n.id, n]),
                ).values(),
              ],
              bookings: [
                ...new Map(
                  [
                    ...currentScheduling.bookings,
                    ...backup.scheduling.bookings,
                  ].map((n) => [n.id, n]),
                ).values(),
              ],
            })
          : undefined;
        if (mergedNotes) useNotesStore.setState({ notes: mergedNotes });
        if (mergedScheduling) useSchedulingStore.setState(mergedScheduling);
        useAppStore.getState().saveEvents(backup.events);
        const state = useStudentStore.getState();
        useStudentStore.setState({
          calendars: [
            ...new Map(
              [...state.calendars, ...backup.calendars].map((c) => [c.id, c]),
            ).values(),
          ],
          assignments: [
            ...new Map(
              [...state.assignments, ...backup.assignments].map((a) => [
                a.id,
                a,
              ]),
            ).values(),
          ],
        });
        update(backup.settings);
        for (const club of backup.clubs)
          useClubStore
            .getState()
            .mergePacket({ format: "calender-club", version: 1, club });
      }
      setPreview(null);
      setPassword("");
      toast.success("Imported to this device");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  return (
    <div className="scroll-page">
      <div className="page-heading">
        <div>
          <h1>
            Settings & privacy<span className="heading-dot">.</span>
          </h1>
          <p>A few preferences. Full control of your data.</p>
        </div>
      </div>
      <Tabs defaultValue="calendar" className="settings-layout">
        <TabsList className="settings-tabs" aria-label="Settings sections">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="settings-panel">
          <div className="settings-columns">
            <section className="content-card settings-section">
              <h2>
                <SlidersHorizontal size={17} /> Your calendar
              </h2>
              <p>
                All times follow this device’s local timezone:{" "}
                {Intl.DateTimeFormat().resolvedOptions().timeZone}. Your classes
                keep their local wall-clock time when you travel.
              </p>
              <label className="settings-row">
                Week starts on
                <select
                  className="student-select"
                  value={settings.weekStartsOn}
                  onChange={(e) =>
                    update({ weekStartsOn: Number(e.target.value) as 0 | 1 })
                  }
                >
                  <option value={1}>Monday</option>
                  <option value={0}>Sunday</option>
                </select>
              </label>
              <label className="settings-row">
                Time format
                <select
                  className="student-select"
                  value={settings.timeFormat}
                  onChange={(e) =>
                    update({ timeFormat: e.target.value as "12h" | "24h" })
                  }
                >
                  <option value="12h">12 hour</option>
                  <option value="24h">24 hour</option>
                </select>
              </label>
              <label className="settings-row">
                Calendar opens at
                <select
                  className="student-select"
                  value={settings.dayStartHour}
                  onChange={(e) =>
                    update({ dayStartHour: Number(e.target.value) })
                  }
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
              <label className="settings-row">
                Show weekends
                <input
                  type="checkbox"
                  checked={settings.showWeekends}
                  onChange={(e) => update({ showWeekends: e.target.checked })}
                />
              </label>
              <label className="settings-row">
                Appearance
                <select
                  className="student-select"
                  value={resolvedTheme ?? "light"}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
            </section>
            <section className="content-card settings-section">
              <h2>Course calendars</h2>
              <p className="!mb-0">
                {calendars.map((c) => c.name).join(" · ")}. Add courses from the
                sidebar; use their checkboxes to filter calendar and agenda
                views.
              </p>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="connections" className="settings-panel">
          <div className="settings-columns">
            <CanvasImport />
            <section className="content-card settings-section">
              <h2>
                <Download size={17} /> Other calendar files
              </h2>
              <p>
                Move events between Candid and Google, Proton, or another
                calendar using an .ics file.
              </p>
              <div className="backup-actions">
                <Button
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  <FileUp /> Import calendar file
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const { exportIcs } = await import("@/lib/ical");
                      await downloadFile(
                        "candid-events.ics",
                        exportIcs(useAppStore.getState().events),
                        "text/calendar;charset=utf-8",
                      );
                    } catch (error) {
                      toast.error((error as Error).message);
                    }
                  }}
                >
                  <Download /> Export events as .ics
                </Button>
              </div>
              <p className="!mt-4 !mb-0">
                Exports include expanded event dates. Assignments and clubs are
                included in planner backups, not calendar files.
              </p>
            </section>
          </div>
        </TabsContent>
        <TabsContent
          value="backups"
          className="settings-panel settings-panel-narrow"
        >
          <section className="content-card settings-section">
            <h2>
              <LockKeyhole size={17} /> Back up your planner
            </h2>
            <p>
              Includes personal events, assignments, course calendars,
              preferences and club dashboards. Transfer a backup between your
              macOS and Windows devices.
            </p>
            <label className="flex gap-2 items-center text-xs mb-4">
              <input
                type="checkbox"
                checked={encrypted}
                onChange={(e) => setEncrypted(e.target.checked)}
              />{" "}
              Encrypt backup with a password
            </label>
            <Field
              label="Backup password"
              htmlFor="backup-password"
              hint="At least 8 characters. Also used to open encrypted imports. There is no password recovery."
            >
              <Input
                id="backup-password"
                type="password"
                autoComplete="off"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter before export or encrypted import"
              />
            </Field>
            {!encrypted && (
              <p className="text-xs text-fg-2 mt-3">
                This backup will be readable by anyone with the file.
              </p>
            )}
            <div className="backup-actions mt-5">
              <Button
                variant="brand"
                disabled={busy || (encrypted && password.length < 8)}
                onClick={() => void exportBackup()}
              >
                <Download />
                {busy ? "Preparing…" : "Export backup"}
              </Button>
              <Button disabled={busy} onClick={() => fileRef.current?.click()}>
                <FileUp /> Import file
              </Button>
            </div>
            <p className="!mt-4 !mb-0">
              Import a .candid backup, .json backup, or .ics calendar. Review
              the counts before merging. For an encrypted import, enter its
              password first.
            </p>
          </section>
        </TabsContent>
        <TabsContent
          value="privacy"
          className="settings-panel settings-panel-narrow"
        >
          <section className="content-card settings-section">
            <h2>
              <ShieldCheck size={17} /> Private by design
            </h2>
            <p>
              No accounts, ads, analytics or calendar cloud. Personal data is
              saved in this app’s local web storage. It is not encrypted at
              rest; use your device’s disk encryption and lock screen. Clearing
              app or browser data removes your planner, so keep backups.
            </p>
            <p>
              Club pairing uses an encrypted direct peer connection. Paired
              peers have equal edit access to that club. Club exports and .ics
              files are unencrypted. Personal data is excluded from club sync.
            </p>
            <p className="!mb-0">
              Reminders appear inside the open app. Background operating-system
              notifications and automatic cloud integrations are not included.
            </p>
          </section>
        </TabsContent>
      </Tabs>
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        aria-label="Import planner file"
        accept=".candid,.calender,.json,.ics"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            const text = await readSmallFile(
              file,
              file.name.endsWith(".ics") ? 2000000 : 10000000,
            );
            if (text.trimStart().startsWith("BEGIN:VCALENDAR")) {
              const { importIcs } = await import("@/lib/ical");
              const result = importIcs(text, toKey(new Date()));
              setPreview({ kind: "ics", ...result });
            } else
              setPreview({
                kind: "backup",
                backup: await decodeBackup(text, password),
              });
          } catch (error) {
            toast.error((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent>
          <DialogTitle>Review your import</DialogTitle>
          <DialogDescription>
            {preview?.kind === "backup"
              ? `${preview.backup.events.length} events, ${preview.backup.assignments.length} assignments, ${preview.backup.calendars.length} calendars and ${preview.backup.clubs.length} clubs. Matching personal IDs will use the backup’s data. Your other items stay. Calendar preferences will be restored.`
              : `${preview?.events.length ?? 0} event occurrences. Matching imported IDs will be updated. ${preview?.kind === "ics" && preview.recurring ? "Recurring events are expanded from 30 days ago through the next year, and can be edited individually." : ""}`}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setPreview(null)}>Cancel</Button>
            <Button variant="brand" onClick={merge}>
              Merge into planner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
