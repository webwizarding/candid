"use client";
import { useRef, useState } from "react";
import { Download, GraduationCap, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/dialogs/field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { readSmallFile } from "@/lib/files";
import { toKey } from "@/lib/dates";
import { useAppStore } from "@/stores/app-store";
import { useStudentStore } from "@/stores/student-store";
import type { parseCanvasCalendar } from "@/lib/canvas";
export function CanvasImport() {
  const [feed, setFeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [asTasks, setAsTasks] = useState(true);
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof parseCanvasCalendar>
  > | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const prepare = async (text: string) => {
    const { parseCanvasCalendar } = await import("@/lib/canvas");
    setPreview(await parseCanvasCalendar(text, toKey(new Date())));
  };
  return (
    <section className="content-card settings-section">
      <h2>
        <GraduationCap size={18} /> Canvas calendar
      </h2>
      <p>Bring course events and assignment deadlines into your planner.</p>
      <details className="help-disclosure">
        <summary>Where do I find my Canvas feed?</summary>
        <p>
          In Canvas, open Calendar → Calendar Feed. Download the .ics file, or
          copy its private link for the desktop app.
        </p>
      </details>
      <Button onClick={() => input.current?.click()} disabled={busy}>
        <Upload /> Import Canvas .ics
      </Button>
      <input
        type="file"
        accept=".ics"
        ref={input}
        className="sr-only"
        aria-label="Import Canvas calendar file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            await prepare(await readSmallFile(file));
          } catch (error) {
            toast.error((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <div className="mt-5 grid gap-3">
        <Field
          label="Private Canvas feed link"
          htmlFor="canvas-feed"
          hint="Fetched directly from Canvas. Your private link is not saved or shared."
        >
          <Input
            id="canvas-feed"
            type="password"
            autoComplete="off"
            placeholder="https://canvas.ucsc.edu/feeds/calendars/…ics"
            value={feed}
            onChange={(e) => setFeed(e.target.value)}
          />
        </Field>
        <Button
          disabled={busy || !feed.trim()}
          onClick={async () => {
            if (!("__TAURI_INTERNALS__" in window)) {
              toast("Direct feed imports are available in the desktop app", {
                description:
                  "Download the .ics file from Canvas and use Import Canvas .ics in this browser.",
              });
              return;
            }
            setBusy(true);
            try {
              const { normalizeCanvasFeed } = await import("@/lib/canvas");
              const url = normalizeCanvasFeed(feed);
              const { invoke } = await import("@tauri-apps/api/core");
              const text = await invoke<string>("fetch_canvas_feed", { url });
              setFeed("");
              await prepare(text);
            } catch (error) {
              toast.error(
                typeof error === "string" ? error : (error as Error).message,
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download />{" "}
          {busy ? "Reading calendar…" : "Fetch feed in desktop app"}
        </Button>
      </div>
      <details className="help-disclosure mt-4">
        <summary>Supported links and import limits</summary>
        <p>
          Direct fetch supports canvas.ucsc.edu and *.instructure.com. Other
          Canvas domains use file import. Imports update matching items on
          demand; they are not a live subscription. Undated assignments are not
          included.
        </p>
      </details>
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent>
          <DialogTitle>Review Canvas calendar</DialogTitle>
          <DialogDescription>
            {preview?.events.length ?? 0} calendar occurrences, including{" "}
            {preview?.assignments.length ?? 0} recognized assignment deadlines.
            They will appear in a separate Canvas calendar. Existing matches
            update; other items stay.
          </DialogDescription>
          <label className="flex gap-2 items-start text-sm leading-relaxed">
            <input
              className="mt-1"
              type="checkbox"
              checked={asTasks}
              onChange={(e) => setAsTasks(e.target.checked)}
            />{" "}
            Turn recognized assignment deadlines into tasks instead of calendar
            events
          </label>
          <p className="text-xs text-fg-2">
            Your completion status and time estimates are preserved when
            reimporting Canvas tasks. Canvas controls which course data and
            dates are present in its feed.
          </p>
          <Button
            variant="brand"
            onClick={() => {
              if (!preview) return;
              const state = useStudentStore.getState();
              if (!state.calendars.some((c) => c.id === "canvas"))
                useStudentStore.setState({
                  calendars: [
                    ...state.calendars,
                    {
                      id: "canvas",
                      name: "Canvas",
                      color: "orange",
                      hidden: false,
                    },
                  ],
                });
              useAppStore
                .getState()
                .saveEvents(
                  asTasks
                    ? preview.events.filter(
                        (e) => !preview.assignmentEventIds.has(e.id),
                      )
                    : preview.events,
                );
              if (asTasks) {
                for (const a of preview.assignments) {
                  const old = useStudentStore
                    .getState()
                    .assignments.find((item) => item.id === a.id);
                  useStudentStore.getState().saveAssignment({
                    ...a,
                    done: old?.done ?? false,
                    estimate: old?.estimate ?? 60,
                    priority: old?.priority ?? "normal",
                  });
                }
              }
              setPreview(null);
              toast.success("Canvas calendar imported");
            }}
          >
            Import into Candid
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
