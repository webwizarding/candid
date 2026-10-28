"use client";
import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, Sprout } from "lucide-react";
import { toast } from "sonner";
import { useStudentStore } from "@/stores/student-store";
import { Button } from "@/components/ui/button";

export function FocusMonitor() {
  useEffect(() => {
    const check = () => {
      const { focus, setFocus } = useStudentStore.getState();
      if (focus.until && Date.now() >= focus.until) {
        setFocus({ until: null, remaining: 0, sessions: focus.sessions + 1 });
        toast.success("A little progress, made.", {
          description:
            focus.label || "Your focus session is complete. Take a break.",
          duration: 15000,
        });
      }
    };
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, []);
  return null;
}
export function FocusPage() {
  const focus = useStudentStore((s) => s.focus);
  const setFocus = useStudentStore((s) => s.setFocus);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = focus.until
    ? Math.max(0, Math.ceil((focus.until - now) / 1000))
    : focus.remaining;
  const progress = 1 - seconds / (focus.duration * 60);
  return (
    <div className="scroll-page">
      <div className="page-heading">
        <div>
          <h1>
            One thing at a time<span className="heading-dot">.</span>
          </h1>
          <p>A small pocket of time for something that matters.</p>
        </div>
      </div>
      <div className="focus-page-card">
        <div className="focus-leaf">
          <Sprout size={26} />
        </div>
        <label htmlFor="focus-label" className="text-sm text-fg-2">
          What are you working on?
        </label>
        <input
          id="focus-label"
          className="focus-task-input"
          maxLength={120}
          placeholder="Give this session a purpose…"
          value={focus.label}
          onChange={(e) => setFocus({ label: e.target.value })}
        />
        <div
          className="pill-tabs mb-7"
          role="group"
          aria-label="Session duration"
        >
          {[25, 50, 10].map((minutes) => (
            <button
              key={minutes}
              disabled={!!focus.until}
              aria-pressed={focus.duration === minutes}
              onClick={() =>
                setFocus({ duration: minutes, remaining: minutes * 60 })
              }
            >
              {minutes === 10 ? "10 min break" : `${minutes} min focus`}
            </button>
          ))}
        </div>
        <div
          className="focus-clock"
          role="timer"
          aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}
          style={
            {
              "--progress": `${Math.max(0, Math.min(100, progress * 100))}%`,
            } as React.CSSProperties
          }
        >
          <div>
            <span>
              {String(Math.floor(seconds / 60)).padStart(2, "0")}
              <span className="clock-colon">:</span>
              {String(seconds % 60).padStart(2, "0")}
            </span>
            <small>
              {focus.until
                ? "You’ve got this."
                : seconds === 0
                  ? "Time for a little breather."
                  : "Ready when you are."}
            </small>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <Button
            variant="brand"
            className="h-11 min-w-40"
            onClick={() => {
              if (focus.until) setFocus({ until: null, remaining: seconds });
              else {
                const duration = seconds || focus.duration * 60;
                setNow(Date.now());
                setFocus({
                  until: Date.now() + duration * 1000,
                  remaining: duration,
                });
              }
            }}
          >
            {focus.until ? (
              <>
                <Pause /> Pause session
              </>
            ) : (
              <>
                <Play />{" "}
                {seconds === focus.duration * 60 || seconds === 0
                  ? "Start session"
                  : "Resume session"}
              </>
            )}
          </Button>
          <Button
            className="h-11 w-11"
            aria-label="Reset timer"
            onClick={() =>
              setFocus({ until: null, remaining: focus.duration * 60 })
            }
          >
            <RotateCcw />
          </Button>
        </div>
        <p className="focus-footnote">
          {focus.sessions} sessions completed on this device · Timer continues
          when you change pages.
        </p>
      </div>
    </div>
  );
}
