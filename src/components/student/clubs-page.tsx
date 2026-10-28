"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  Download,
  FileUp,
  MessageSquare,
  Plus,
  Radio,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useClubStore } from "@/stores/club-store";
import {
  type Club,
  type ClubPacket,
  type ClubRecord,
  clubPacket,
  validateClubPacket,
} from "@/lib/clubs";
import { useTorSync } from "@/hooks/use-tor-sync";
import { TorPairControls } from "./tor-pair-controls";
import { ClubPeer, readPairing } from "@/lib/club-peer";
import { downloadFile, readSmallFile } from "@/lib/files";
import { formatShort, formatTimeRange, toKey } from "@/lib/dates";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/dialogs/field";

function PeerPanel({
  open,
  onClose,
  club,
  onJoin,
  onTorActivity,
}: {
  open: boolean;
  onClose: () => void;
  club?: Club;
  onJoin: (id: string) => void;
  onTorActivity: (phase: string) => void;
}) {
  const tor = useTorSync();
  useEffect(() => {
    onTorActivity(tor.phase);
  }, [tor.phase, onTorActivity]);
  const [mode, setMode] = useState<"nearby" | "tor">("nearby");
  const [status, setStatus] = useState("Not connected");
  const [code, setCode] = useState("");
  const [remote, setRemote] = useState("");
  const [busy, setBusy] = useState(false);
  const [host, setHost] = useState(false);
  const [pairedClub, setPairedClub] = useState<string | null>(null);
  const peer = useRef<ClubPeer | null>(null);
  const sharedId = useRef<string | null>(null);
  useEffect(() => {
    const unsubscribe = useClubStore.subscribe((state, previous) => {
      const next = state.clubs.find((c) => c.id === sharedId.current);
      const old = previous.clubs.find((c) => c.id === sharedId.current);
      if (next && next !== old) peer.current?.send(next);
    });
    return () => {
      unsubscribe();
      peer.current?.close();
    };
  }, []);
  const createPeer = (target: Pick<Club, "id" | "name">) => {
    peer.current?.close();
    sharedId.current = target.id;
    setPairedClub(target.name);
    const p = new ClubPeer(
      target,
      (packet) => useClubStore.getState().mergePacket(packet),
      (message) => {
        setStatus(message);
        if (message.startsWith("Connected")) {
          const latest = useClubStore
            .getState()
            .clubs.find((c) => c.id === target.id);
          if (latest) peer.current?.send(latest);
        }
      },
    );
    peer.current = p;
    return p;
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[620px]">
        <DialogTitle>Pair a club with a peer</DialogTitle>
        <DialogDescription>
          {mode === "tor" ? (
            "Optional private internet pairing through your separate Tor runtime."
          ) : (
            <>
              Experimental direct local-network sync. No signaling server, STUN
              or relay. Both people must keep the Clubs page open. Campus
              network isolation may block pairing.
            </>
          )}
        </DialogDescription>
        <Tabs
          value={mode}
          onValueChange={(value) => {
            if (value === mode) return;
            if (value === "nearby") tor.stop();
            else {
              peer.current?.close();
              peer.current = null;
              sharedId.current = null;
              setStatus("Disconnected");
              setCode("");
              setRemote("");
            }
            setMode(value as "nearby" | "tor");
          }}
        >
          <TabsList className="h-10 max-w-full" aria-label="Pairing connection">
            <TabsTrigger
              value="nearby"
              className="px-3 text-fg-2! data-active:text-fg!"
            >
              Nearby
            </TabsTrigger>
            <TabsTrigger
              value="tor"
              className="px-3 text-fg-2! data-active:text-fg!"
            >
              Private internet · Tor
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tor">
            <TorPairControls tor={tor} club={club} onJoin={onJoin} />
          </TabsContent>
          <TabsContent value="nearby" className="grid gap-4">
            <div className="peer-status" role="status">
              <Radio size={16} />
              {pairedClub ? `${pairedClub} · ` : ""}
              {status}
            </div>
            <p className="text-xs text-fg-2 leading-relaxed">
              Exchange codes privately. A paired peer can read and edit this
              club. Personal calendars and assignments are never included.
              Closing this dialog keeps the connection; leaving Clubs
              disconnects it.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Button
                disabled={busy || !club}
                onClick={() =>
                  void run(async () => {
                    setHost(true);
                    setCode(await createPeer(club!).offer());
                    setStatus("Offer ready · send it to your peer");
                  })
                }
              >
                1. Create offer for {club?.name ?? "a club"}
              </Button>
              <Button
                disabled={busy || !remote.trim()}
                onClick={() =>
                  void run(async () => {
                    const offer = readPairing(remote);
                    if (offer.description.type !== "offer")
                      throw new Error("Paste an offer to create an answer.");
                    useClubStore.getState().mergePacket({
                      format: "calender-club",
                      version: 1,
                      club: { ...offer.club, records: [] },
                    });
                    onJoin(offer.club.id);
                    setHost(false);
                    setCode(await createPeer(offer.club).answer(remote));
                    setStatus("Answer ready · send it back to the host");
                  })
                }
              >
                Join offer & create answer
              </Button>
            </div>
            <Field label="Peer’s pairing code" htmlFor="peer-remote">
              <Textarea
                id="peer-remote"
                rows={3}
                maxLength={100000}
                placeholder="Paste their complete offer or answer here"
                value={remote}
                onChange={(e) => setRemote(e.target.value)}
              />
            </Field>
            {host && (
              <Button
                disabled={busy || !remote.trim()}
                onClick={() =>
                  void run(async () => {
                    await peer.current?.accept(remote);
                    setStatus("Connecting · keep both peers online");
                  })
                }
              >
                3. Accept peer’s answer
              </Button>
            )}
            {code && (
              <Field
                label={
                  host
                    ? "2. Send this offer to your peer"
                    : "2. Send this answer back to the host"
                }
                htmlFor="peer-code"
              >
                <Textarea
                  id="peer-code"
                  value={code}
                  readOnly
                  rows={3}
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    downloadFile("candid-pairing.txt", code, "text/plain")
                  }
                >
                  Save pairing code
                </Button>
              </Field>
            )}
            <div className="flex justify-between gap-2">
              <Button
                onClick={() => {
                  peer.current?.close();
                  peer.current = null;
                  sharedId.current = null;
                  setStatus("Disconnected");
                  setPairedClub(null);
                  setCode("");
                }}
              >
                Disconnect
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <Button variant="brand" onClick={onClose}>
          Back to dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function RecordForm({
  type,
  clubId,
  onClose,
}: {
  type: ClubRecord["type"];
  clubId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(toKey(new Date()));
  const [start, setStart] = useState("17:00");
  const [end, setEnd] = useState("18:00");
  const [assignee, setAssignee] = useState("");
  const minute = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>
          {type === "post"
            ? "Post an update"
            : type === "task"
              ? "Add a club task"
              : "Plan a club event"}
        </DialogTitle>
        <DialogDescription>
          Shared only within this club when you sync or export it.
        </DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            useClubStore.getState().saveRecord(clubId, {
              id: crypto.randomUUID(),
              type,
              title: title.trim(),
              body,
              date,
              start: type === "event" ? minute(start) : 0,
              end: type === "event" ? minute(end) : 1440,
              assignee,
              done: false,
              deleted: false,
            });
            onClose();
          }}
        >
          <Field label="Title" htmlFor="club-record-title">
            <Input
              id="club-record-title"
              autoFocus
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          {type !== "post" && (
            <Field
              label={type === "task" ? "Due date" : "Date"}
              htmlFor="club-record-date"
            >
              <Input
                id="club-record-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          )}
          {type === "event" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="club-start">
                <Input
                  id="club-start"
                  type="time"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field label="End" htmlFor="club-end">
                <Input
                  id="club-end"
                  type="time"
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
            </div>
          )}
          {type === "task" && (
            <Field label="Assigned to (optional)" htmlFor="club-assignee">
              <Input
                id="club-assignee"
                maxLength={80}
                placeholder="A name your club recognizes"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              />
            </Field>
          )}
          <Field
            label={type === "post" ? "Update" : "Details / location"}
            htmlFor="club-record-body"
          >
            <Textarea
              id="club-record-body"
              rows={3}
              maxLength={10000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          {type === "event" && minute(end) <= minute(start) && (
            <p className="text-sm text-danger" role="alert">
              End time must be after the start time.
            </p>
          )}
          <Button
            type="submit"
            variant="brand"
            disabled={type === "event" && minute(end) <= minute(start)}
          >
            Save to club
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClubsPage() {
  const clubs = useClubStore((s) => s.clubs);
  const displayName = useClubStore((s) => s.displayName);
  const [selected, setSelected] = useState("");
  const club = clubs.find((c) => c.id === selected) ?? clubs[0];
  const [newClub, setNewClub] = useState(false);
  const [name, setName] = useState("");
  const [pairOpen, setPairOpen] = useState(false);
  const [torActivity, setTorActivity] = useState("off");
  const [recordType, setRecordType] = useState<ClubRecord["type"] | null>(null);
  const [preview, setPreview] = useState<ClubPacket | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const live = club?.records.filter((r) => !r.deleted) ?? [];
  const remove = (r: ClubRecord) => {
    useClubStore.getState().saveRecord(club!.id, { ...r, deleted: true });
    toast("Club item deleted", {
      action: {
        label: "Undo",
        onClick: () =>
          useClubStore
            .getState()
            .saveRecord(club!.id, { ...r, deleted: false }),
      },
    });
  };
  return (
    <div className="scroll-page">
      <div className="page-heading">
        <div>
          <h1>
            Campus, together<span className="heading-dot">.</span>
          </h1>
          <p>Club plans, tasks and updates. Yours to share, peer to peer.</p>
        </div>
        <Button variant="brand" onClick={() => setNewClub(true)}>
          <Plus /> New club
        </Button>
      </div>
      <div className="club-toolbar">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="student-select w-auto max-w-[220px]"
            aria-label="Selected club"
            value={club?.id ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {!clubs.length && <option value="">Choose a club</option>}
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="text-xs text-fg-2 flex items-center gap-2">
            Your name
            <Input
              aria-label="Your club display name"
              className="w-32"
              maxLength={80}
              value={displayName}
              onChange={(e) =>
                useClubStore.getState().setDisplayName(e.target.value)
              }
            />
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => setPairOpen(true)}>
            <Radio />{" "}
            {torActivity === "off"
              ? "Pair & sync"
              : `Pair & sync · Tor ${torActivity === "starting" ? "starting" : torActivity === "invite" ? "waiting" : "connected"}`}
          </Button>
          <Button
            size="sm"
            disabled={!club}
            onClick={() =>
              downloadFile(
                "candid-club.json",
                JSON.stringify(clubPacket(club!), null, 2),
              )
            }
          >
            <Download /> Export club
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <FileUp /> Import club
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            aria-label="Import club snapshot"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                setPreview(
                  validateClubPacket(JSON.parse(await readSmallFile(file))),
                );
              } catch (error) {
                toast.error((error as Error).message);
              }
            }}
          />
        </div>
      </div>
      <p className="club-privacy-note">
        Only this club is shared. Exports are plain JSON; transfer them
        privately. Conflicting edits to one item resolve by revision and device
        ID. Deletions sync too.
      </p>
      {!club ? (
        <div className="content-card empty-state">
          <Users size={36} />
          <h2>Your people. Your plans.</h2>
          <p>
            Create a club dashboard, join a peer’s offer, or import a club file.
          </p>
          <Button onClick={() => setNewClub(true)}>
            <Plus /> Create your first club
          </Button>
        </div>
      ) : (
        <>
          <div className="stat-grid club-summary">
            {[
              ["Upcoming plans", live.filter((r) => r.type === "event").length],
              [
                "Open tasks",
                live.filter((r) => r.type === "task" && !r.done).length,
              ],
              ["Club updates", live.filter((r) => r.type === "post").length],
            ].map(([label, number]) => (
              <div className="stat-card" key={label}>
                <span>{label}</span>
                <strong>{number}</strong>
                <small>{club.name}</small>
              </div>
            ))}
          </div>
          <div className="club-board">
            {(
              [
                { type: "event", label: "Events", icon: CalendarDays },
                { type: "task", label: "Tasks", icon: CheckSquare },
                { type: "post", label: "Updates", icon: MessageSquare },
              ] as const
            ).map(({ type, label, icon: Icon }) => (
              <section className="content-card club-column" key={type}>
                <div className="club-column-title">
                  <h2>
                    <Icon size={16} /> {label}
                  </h2>
                  <button
                    className="icon-button"
                    aria-label={`Add club ${type}`}
                    onClick={() => setRecordType(type)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                {!live.some((r) => r.type === type) ? (
                  <p className="club-empty">
                    {type === "event"
                      ? "The next good thing starts with a plan."
                      : type === "task"
                        ? "Give everyone a clear next step."
                        : "Keep your people in the loop."}
                  </p>
                ) : (
                  live
                    .filter((r) => r.type === type)
                    .sort((a, b) =>
                      type === "post"
                        ? b.clock - a.clock
                        : a.date.localeCompare(b.date) || a.start - b.start,
                    )
                    .map((r) => (
                      <article className="club-record" key={r.id}>
                        <div className="flex gap-2 items-start">
                          {type === "task" && (
                            <input
                              type="checkbox"
                              aria-label={`Complete ${r.title}`}
                              checked={r.done}
                              onChange={() =>
                                useClubStore
                                  .getState()
                                  .saveRecord(club.id, { ...r, done: !r.done })
                              }
                            />
                          )}
                          <h3
                            className={r.done ? "line-through text-fg-2" : ""}
                          >
                            {r.title}
                          </h3>
                          <button
                            className="icon-button ml-auto"
                            aria-label={`Delete ${r.title}`}
                            onClick={() => remove(r)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {type !== "post" && (
                          <small>
                            {formatShort(r.date)}
                            {type === "event"
                              ? ` · ${formatTimeRange(r.start, r.end)}`
                              : r.assignee
                                ? ` · ${r.assignee}`
                                : ""}
                          </small>
                        )}
                        {r.body && <p>{r.body}</p>}
                        <div className="club-record-footer">
                          <span>{r.authorName}</span>
                          {type === "event" && (
                            <button
                              onClick={() => {
                                useAppStore.getState().saveEvents([
                                  {
                                    id: `club-copy-${club.id}-${r.id}`,
                                    title: `${club.name} · ${r.title}`,
                                    date: r.date,
                                    start: r.start,
                                    end: r.end,
                                    allDay: false,
                                    color: "cyan",
                                    calendarId: "personal",
                                    kind: "personal",
                                    note: r.body,
                                  },
                                ]);
                                toast.success(
                                  "Copied to your personal calendar",
                                  {
                                    description:
                                      "A personal copy; future club edits do not update it.",
                                  },
                                );
                              }}
                            >
                              Copy to calendar
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                )}
              </section>
            ))}
          </div>
        </>
      )}
      <PeerPanel
        open={pairOpen}
        onClose={() => setPairOpen(false)}
        club={club}
        onJoin={setSelected}
        onTorActivity={setTorActivity}
      />
      <Dialog open={newClub} onOpenChange={setNewClub}>
        <DialogContent>
          <DialogTitle>Create a club dashboard</DialogTitle>
          <DialogDescription>
            Start locally. Invite a peer when you’re ready.
          </DialogDescription>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setSelected(useClubStore.getState().createClub(name));
              setName("");
              setNewClub(false);
            }}
          >
            <Field label="Club name" htmlFor="club-name">
              <Input
                id="club-name"
                autoFocus
                required
                maxLength={100}
                placeholder="e.g. Film Society"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Button variant="brand">Create club</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent>
          <DialogTitle>Import {preview?.club.name}?</DialogTitle>
          <DialogDescription>
            {preview?.club.records.filter((r) => !r.deleted).length} active club
            items. A matching club will merge by record revision; other personal
            data stays on this device.
          </DialogDescription>
          <Button
            variant="brand"
            onClick={() => {
              if (!preview) return;
              useClubStore.getState().mergePacket(preview);
              setSelected(preview.club.id);
              setPreview(null);
              toast.success("Club snapshot merged");
            }}
          >
            Merge club snapshot
          </Button>
        </DialogContent>
      </Dialog>
      {recordType && club && (
        <RecordForm
          type={recordType}
          clubId={club.id}
          onClose={() => setRecordType(null)}
        />
      )}
    </div>
  );
}
