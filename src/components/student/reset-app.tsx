"use client";

import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useStudentStore } from "@/stores/student-store";
import { useClubStore } from "@/stores/club-store";
import { useNotesStore } from "@/stores/notes-store";
import { useSchedulingStore } from "@/stores/scheduling-store";
import { clearAppStorage, restartEmptyApp } from "@/lib/reset-app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/dialogs/field";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ResetApp({ onBackup }: { onBackup: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const events = useAppStore((state) => state.events.length);
  const assignments = useStudentStore((state) => state.assignments.length);
  const notes = useNotesStore((state) => state.notes.length);
  const clubs = useClubStore((state) => state.clubs.length);
  const bookings = useSchedulingStore((state) => state.bookings.length);
  return (
    <section className="content-card settings-section">
      <h2>
        <RotateCcw size={17} /> Fresh start
      </h2>
      <p>
        Start Candid from scratch on this device. This clears your calendar,
        assignments, notes and trash, clubs, scheduling, focus timer history,
        and preferences.
      </p>
      <div className="backup-actions">
        <Button onClick={onBackup}>
          <Download /> Back up first
        </Button>
        <AlertDialog
          onOpenChange={() => {
            setConfirmation("");
            setError("");
            setBusy(false);
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="reset-app-button">
              <RotateCcw /> Reset Candid
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all of Candid?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="block">
                  Permanently remove all Candid data on this device and return
                  to a fresh app. This cannot be undone. Export a backup first
                  if you want to recover it later.
                </span>
                <span className="mt-3 block">
                  Saved export files and other people’s club copies stay. Guests
                  are not notified and bookings are not cancelled for them.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="rounded-lg border border-hairline p-3 text-xs leading-relaxed text-fg-2">
              {events} events · {assignments} assignments · {notes} notes
              (including trash) · {clubs} clubs · {bookings} bookings
            </p>
            <Field label="Type RESET to confirm" htmlFor="reset-confirmation">
              <Input
                id="reset-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="characters"
                aria-describedby={error ? "reset-error" : undefined}
              />
            </Field>
            {error && (
              <p id="reset-error" role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                className="reset-app-button"
                disabled={confirmation !== "RESET" || busy}
                onClick={() => {
                  setBusy(true);
                  setError("");
                  try {
                    clearAppStorage(window.localStorage, window.sessionStorage);
                    restartEmptyApp();
                  } catch (reason) {
                    setError((reason as Error).message);
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Resetting…" : "Erase everything & restart"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
