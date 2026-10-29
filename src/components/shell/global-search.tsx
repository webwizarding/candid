"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckSquare, Search } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAppStore } from "@/stores/app-store";
import { useNotesStore } from "@/stores/notes-store";
import { noteTitle } from "@/lib/notes";
import { useStudentStore } from "@/stores/student-store";
import { useOverlayStore, openOverlay } from "@/stores/overlay-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { formatShort } from "@/lib/dates";

export function GlobalSearchTrigger() {
  return (
    <button aria-label="Search" onClick={() => openOverlay({ kind: "search" })}>
      <Search size={18} />
    </button>
  );
}
export function GlobalSearch() {
  const open = useOverlayStore((s) => s.overlay.kind === "search");
  const close = useOverlayStore((s) => s.close);
  const events = useAppStore((s) => s.events);
  const assignments = useStudentStore((s) => s.assignments);
  const notes = useNotesStore((s) => s.notes);
  const router = useRouter();
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (useOverlayStore.getState().overlay.kind === "search") close();
        else openOverlay({ kind: "search" });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [close]);
  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => !v && close()}
      title="Search your planner"
      description="Find events, assignments or a page."
    >
      <Command>
        <CommandInput placeholder="Events, assignments, places, notes…" />
        <CommandList>
          <CommandEmpty>No matches. Try a different word.</CommandEmpty>
          <CommandGroup heading="Go to">
            {[
              ["/", "Calendar"],
              ["/agenda", "Agenda"],
              ["/assignments", "Assignments"],
              ["/focus", "Focus timer"],
              ["/clubs", "Clubs"],
              ["/scheduling", "Scheduling"],
              ["/notes", "Notes"],
              ["/settings", "Settings & backups"],
            ].map(([href, label]) => (
              <CommandItem
                key={href}
                onSelect={() => {
                  close();
                  router.push(href);
                }}
              >
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Events">
            {events.map((e) => (
              <CommandItem
                key={e.id}
                value={`${e.title} ${e.note} ${e.location} ${e.date} ${e.id}`}
                onSelect={() => {
                  close();
                  const calendar = useCalendarStore.getState();
                  calendar.setView("day");
                  calendar.focusEvent(e.id, e.date);
                  router.push("/");
                }}
              >
                <CalendarDays size={16} />
                <span className="flex-1 truncate">{e.title}</span>
                <span className="text-xs text-fg-2">{formatShort(e.date)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Notes">
            {notes
              .filter((n) => !n.deletedAt)
              .map((n) => (
                <CommandItem
                  key={n.id}
                  value={`${n.path} ${n.body}`}
                  onSelect={() => {
                    close();
                    router.push(`/notes#${encodeURIComponent(n.id)}`);
                  }}
                >
                  <span className="flex-1 truncate">{noteTitle(n.path)}</span>
                  <span className="text-xs text-fg-2">{n.path}</span>
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandGroup heading="Assignments">
            {assignments.map((a) => (
              <CommandItem
                key={a.id}
                value={`${a.title} ${a.notes} ${a.due} ${a.id}`}
                onSelect={() => {
                  close();
                  router.push(`/assignments#${a.id}`);
                }}
              >
                <CheckSquare size={16} />
                <span className="flex-1">{a.title}</span>
                <span className="text-xs text-fg-2">
                  {a.done ? "Done" : formatShort(a.due)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
