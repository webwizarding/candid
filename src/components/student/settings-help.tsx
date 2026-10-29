"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Answer = {
  question: string;
  answer: string;
  steps?: string[];
  link?: { href: string; label: string };
};
const topics: { title: string; questions: Answer[] }[] = [
  {
    title: "Calendar & studying",
    questions: [
      {
        question: "How do I add my classes?",
        answer:
          "Choose New event, enter the class time, and select its course calendar. For a weekly class, choose the weekdays and a term end date. Each date can be edited separately afterward.",
        link: { href: "/", label: "Open calendar" },
      },
      {
        question: "What is the difference between an event and an assignment?",
        answer:
          "An event reserves time on your calendar. An assignment tracks a deadline and how much work is left. In Assignments, Plan study time adds a free study block before the deadline when space is available. You can change that block afterward.",
        link: { href: "/assignments", label: "Open assignments" },
      },
      {
        question:
          "Will reminders and the focus timer work when Candid is closed?",
        answer:
          "Reminders appear inside the open app. They are not background system notifications. The focus timer keeps its end time, so it catches up when you reopen Candid. Keep the app open to see completion when it happens.",
        link: { href: "/focus", label: "Open focus timer" },
      },
    ],
  },
  {
    title: "Canvas & maps",
    questions: [
      {
        question: "How do I import my Canvas calendar?",
        answer:
          "Open Calendar in Canvas, then Calendar Feed. Download the .ics calendar file. In Candid, open Settings → Connections → Import Canvas .ics, then review the import. Dated assignments can become tasks; other events go into a Canvas calendar.",
      },
      {
        question: "Why is my Canvas feed link not working?",
        answer:
          "Feed fetching works in the desktop app for canvas.ucsc.edu and schools using instructure.com. Copy a fresh Calendar Feed link from Canvas, rather than a course-page address. If fetching still fails, download the .ics file from Canvas and import it in Connections. Browser previews and other school domains use file import.",
      },
      {
        question: "Do Canvas imports update automatically?",
        answer:
          "No. Import or fetch again when Canvas changes. Reimporting updates matching imported items and keeps task completion. Items removed from Canvas are not removed from Candid automatically. Canvas decides which dates appear in its feed.",
      },
      {
        question: "How do I see an event on a map?",
        answer:
          "Add a physical location to the event, then open its details and choose Show map, Google Maps, or Apple Maps. The embedded Google map loads only after you ask for it. Online meeting locations show a Join meeting link when a supported meeting URL is available.",
      },
    ],
  },
  {
    title: "Scheduling",
    questions: [
      {
        question: "How do I share office hours or a study session?",
        answer:
          "You share a file instead of a live booking link. Only your offered times and session details are included; private calendar titles and notes stay on your device.",
        steps: [
          "In Scheduling → Availability, save your name and weekly hours.",
          "Create a meeting type, then choose Share times → Save standalone booking page.",
          "Send that HTML file to your guest. They can open it in a desktop browser without Candid or internet access.",
          "Ask them to send their saved booking request file back to you.",
        ],
        link: { href: "/scheduling", label: "Open scheduling" },
      },
      {
        question: "When is a booking actually confirmed?",
        answer:
          "Only after the host imports the request and clicks Confirm in Scheduling → Bookings. Saving a guest request does not reserve a time. Candid checks your calendar again before confirming. Send the guest the confirmed calendar file yourself; Candid does not send email.",
      },
      {
        question: "Why are there no times, or why can't I confirm a request?",
        answer:
          "Check that the meeting type is active and your weekly hours are enabled. All calendars, including hidden calendars and all-day events, block time. Buffers and minimum notice can hide more slots. If a request is old or your hours, timezone, or meeting details changed, share fresh times.",
      },
      {
        question: "Will guests see changes or cancellations automatically?",
        answer:
          "No. Shared schedules are snapshots. Send a new file after changing your availability. Tell guests directly about changes, declines, or cancellations, and send an updated calendar file when needed.",
      },
    ],
  },
  {
    title: "Notes & Obsidian",
    questions: [
      {
        question: "Where are my notes saved?",
        answer:
          "Notes save inside Candid on this device after a short pause while you type. Check the saved status before leaving. Daily note opens today's note. Course and event links help you keep notes beside the right class or meeting. Planner backups include your notes and trash.",
        link: { href: "/notes", label: "Open notes" },
      },
      {
        question: "How do links, backlinks, and tags work?",
        answer:
          "Write [[Note name]] to link another note, or [[Folder/Note name]] if names repeat. In Read mode, click the link to open or create that note. Backlinks show notes that link to the one you are reading. Add #biology or another hashtag to filter notes by topic. Renaming a note updates its wiki links.",
      },
      {
        question: "Can I use my Obsidian vault?",
        answer:
          "Yes, through Markdown files. Import .md files or a ZIP of your vault, then review the import. Export Markdown vault ZIP to move active notes back to Obsidian. Duplicate filenames get a numbered copy. This is manual import/export; live folder sync, attachments, and Obsidian plugins are not supported.",
      },
      {
        question: "How do I recover a deleted note?",
        answer:
          "Open Notes, choose the trash icon, and restore the note. You can also use Undo just after moving it to trash. Vault ZIP exports exclude trash; full planner backups include it.",
      },
    ],
  },
  {
    title: "Clubs & peer sharing",
    questions: [
      {
        question: "What is the easiest way to share a club?",
        answer:
          "Use a club file. In Clubs, select your club and export it. The other person imports that JSON file in Clubs. Exchange a fresh file to pass changes back. This works without a live connection. Transfer it privately because anyone with the file can read it.",
        link: { href: "/clubs", label: "Open clubs" },
      },
      {
        question: "What is the difference between Nearby and Tor?",
        answer:
          "Nearby tries a direct connection on the same local network. Campus Wi-Fi or firewalls may block it. Tor connects over the internet and needs a separately installed, running C Tor client on both desktops. Use the Tor setup guide supplied with the download. Both modes are experimental; club files are the fallback.",
      },
      {
        question: "What do I share, and when does live sync stop?",
        answer:
          "Only the selected club's events, tasks, posts, and votes are shared. Personal calendars, assignments, notes, and backups are excluded. Both people can edit that club. Keep Clubs open: closing the pairing dialog keeps the connection, but leaving Clubs or quitting Candid ends it. After a Tor disconnect, make a new invite.",
      },
      {
        question: "How do we choose a time as a group?",
        answer:
          "In Scheduling → Coordination, select a club and propose several times. Members mark every time that works, then exchange club files or sync in Clubs. The proposal creator chooses a time to make a club event. Each member can use Copy to calendar in Clubs to add a personal copy.",
      },
    ],
  },
  {
    title: "Backups & privacy",
    questions: [
      {
        question: "How do I reset the whole app?",
        answer:
          "Open Settings → Privacy → Fresh start. Back up first if you want to keep a copy, then choose Reset Candid and type RESET. This erases all Candid data and preferences on this device and restarts the app. There is no Undo. Exported files and other people's club copies stay, and guests are not notified. Import a backup afterward if you want to restore your planner.",
      },
      {
        question: "How do I move my planner to another device?",
        answer:
          "In Settings → Backups, enter a password and choose Export backup. Move the .candid file privately to the other device, enter the same password in Backups, and import it. Review before merging. This transfers notes and scheduling too. Personal planner changes do not sync automatically between devices.",
      },
      {
        question: "Is everything private and encrypted?",
        answer:
          "Your planner stays on your device unless you export or share it. App storage is not encrypted at rest; use your device's disk encryption and lock screen. Password-protected backups are encrypted. Club files, calendar files, and scheduling files are readable. Maps, opened links, Canvas fetching, and peer connections use the network when you choose them.",
      },
      {
        question: "What if I see a storage warning or lose my backup password?",
        answer:
          "If saving fails, changes may exist only until you close the app. Export a backup before closing, then check available storage. Clearing app or browser data removes your planner. A forgotten backup password cannot be reset; you need another backup or the original device's data.",
      },
    ],
  },
];

export function SettingsHelp() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const visible = topics
    .filter((group) => !topic || group.title === topic)
    .map((group) => ({
      ...group,
      questions: group.questions.filter((item) =>
        [group.title, item.question, item.answer, ...(item.steps || [])]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search),
      ),
    }))
    .filter((group) => group.questions.length);
  const count = visible.reduce((n, group) => n + group.questions.length, 0);
  return (
    <section className="settings-help" aria-labelledby="help-heading">
      <div className="mb-5">
        <h2 id="help-heading" className="text-xl font-semibold">
          Help & FAQ
        </h2>
        <p className="mt-2 text-sm text-fg-2">
          Find a topic, then open a question for a short answer. This help works
          offline.
        </p>
      </div>
      <div className="help-search-row">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-2"
          />
          <Input
            type="search"
            aria-label="Search help"
            placeholder="Search help, e.g. Canvas or booking…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9 pr-10"
          />
          {query && (
            <button
              className="icon-button absolute right-1 top-1/2 -translate-y-1/2"
              aria-label="Clear help search"
              onClick={() => setQuery("")}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <select
          className="student-select"
          aria-label="Help topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        >
          <option value="">All topics</option>
          {topics.map((group) => (
            <option key={group.title}>{group.title}</option>
          ))}
        </select>
      </div>
      <p className="my-4 text-xs text-fg-2" role="status">
        {count} {count === 1 ? "question" : "questions"}
        {search || topic ? " found" : " across 6 topics"}
      </p>
      {count ? (
        <div className="help-topic-grid">
          {visible.map((group) => (
            <section
              className="content-card help-topic"
              key={group.title}
              aria-label={group.title}
            >
              <h3>{group.title}</h3>
              {group.questions.map((item) => (
                <details className="help-question" key={item.question}>
                  <summary>
                    <span>{item.question}</span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </summary>
                  <div className="help-answer">
                    <p>{item.answer}</p>
                    {item.steps && (
                      <ol>
                        {item.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    )}
                    {item.link && (
                      <Link href={item.link.href}>
                        {item.link.label}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </details>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="content-card p-6">
          <h3 className="text-base font-semibold">No matching questions</h3>
          <p className="mt-2 text-sm text-fg-2">
            Try a word like “backup”, “notes”, or “sync”, or reset the filters.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setQuery("");
              setTopic("");
            }}
          >
            Show all questions
          </Button>
        </div>
      )}
    </section>
  );
}
