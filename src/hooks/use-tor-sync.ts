"use client";
import { useEffect, useRef, useState } from "react";
import {
  clubPacket,
  validateClubPacket,
  type Club,
  type ClubPacket,
} from "@/lib/clubs";
import { readTorInvite } from "@/lib/tor-invite";
import { useClubStore } from "@/stores/club-store";
type Signal = {
  id: string;
  state: "starting" | "invite" | "connected" | "packet" | "closed";
  message: string;
  data?: string;
};
type Session = {
  id: string;
  clubId: string;
  accepted: boolean;
  connected: boolean;
  pending?: ClubPacket;
  unlisten?: () => void;
};
const desktop = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
async function invoke<T>(command: string, args: Record<string, unknown>) {
  const api = await import("@tauri-apps/api/core");
  return api.invoke<T>(command, args);
}
export function useTorSync() {
  const current = useRef<Session | null>(null);
  const [status, setStatus] = useState("Tor is off");
  const [phase, setPhase] = useState("off");
  const [sharedClubId, setSharedClubId] = useState<string | undefined>();
  const [invite, setInvite] = useState("");
  const [preview, setPreview] = useState<ClubPacket | null>(null);
  const send = (session: Session) => {
    if (current.current !== session || !session.connected || !session.accepted)
      return;
    const club = useClubStore
      .getState()
      .clubs.find((c) => c.id === session.clubId);
    if (club)
      void invoke("tor_send", {
        id: session.id,
        packet: JSON.stringify(validateClubPacket(clubPacket(club))),
      }).catch(() => {
        if (current.current === session)
          setStatus("Could not send this update. Stop sharing and reconnect.");
      });
  };
  const dispose = (session: Session) => {
    session.unlisten?.();
    if (desktop()) void invoke("tor_stop", { id: session.id }).catch(() => {});
  };
  const stop = () => {
    const session = current.current;
    current.current = null;
    if (session) dispose(session);
    setInvite("");
    setPreview(null);
    setPhase("off");
    setSharedClubId(undefined);
    setStatus("Tor is off");
  };
  useEffect(() => {
    const unsubscribe = useClubStore.subscribe((state, previous) => {
      const session = current.current;
      if (!session) return;
      const club = state.clubs.find((c) => c.id === session.clubId);
      if (club && club !== previous.clubs.find((c) => c.id === session.clubId))
        send(session);
    });
    return () => {
      unsubscribe();
      const session = current.current;
      current.current = null;
      if (session) dispose(session);
    };
    // The subscription operates on refs and the store, never a rendered snapshot.
  }, []);
  const begin = async (
    clubId: string,
    host: boolean,
    command: string,
    args: Record<string, unknown>,
  ) => {
    if (!desktop())
      throw new Error("Tor pairing requires the Candid desktop app.");
    stop();
    const session: Session = {
      id: crypto.randomUUID(),
      clubId,
      accepted: host,
      connected: false,
    };
    current.current = session;
    setSharedClubId(clubId);
    setPhase("starting");
    setStatus("Connecting to your local Tor runtime…");
    try {
      const { listen } = await import("@tauri-apps/api/event");
      const unlisten = await listen<Signal>(
        "candid-tor-sync",
        ({ payload }) => {
          if (current.current !== session || payload.id !== session.id) return;
          setStatus(payload.message);
          if (payload.state === "invite" && payload.data) {
            readTorInvite(payload.data);
            setInvite(payload.data);
            setPhase("invite");
          } else if (payload.state === "connected") {
            session.connected = true;
            setInvite("");
            setPhase("connected");
          } else if (payload.state === "packet" && payload.data) {
            try {
              const packet = validateClubPacket(JSON.parse(payload.data));
              if (packet.club.id !== session.clubId)
                throw new Error("Peer sent a different club.");
              if (session.accepted) useClubStore.getState().mergePacket(packet);
              else {
                session.pending = packet;
                setPreview(packet);
              }
            } catch {
              stop();
              setStatus(
                "The peer sent invalid club data. Nothing was imported.",
              );
            }
          } else if (payload.state === "closed") {
            current.current = null;
            dispose(session);
            setPhase("off");
            setSharedClubId(undefined);
            setInvite("");
            setPreview(null);
          }
        },
      );
      session.unlisten = unlisten;
      if (current.current !== session) {
        unlisten();
        return;
      }
      await invoke(command, { id: session.id, ...args });
    } catch (error) {
      if (current.current === session) {
        stop();
        setStatus(typeof error === "string" ? error : (error as Error).message);
      }
    } finally {
      // A stop/unmount while native startup was in flight must also stop a late native session.
      if (current.current !== session) dispose(session);
    }
  };
  return {
    status,
    phase,
    sharedClubId,
    invite,
    preview,
    stop,
    host: (club: Club, controlPort: number, socksPort: number) =>
      begin(club.id, true, "tor_host", {
        packet: JSON.stringify(validateClubPacket(clubPacket(club))),
        controlPort,
        socksPort,
      }),
    join: (code: string, socksPort: number) => {
      const invite = readTorInvite(code);
      return begin(invite.clubId, false, "tor_join", {
        code: code.trim(),
        socksPort,
      });
    },
    accept: () => {
      const session = current.current;
      const packet = session?.pending;
      if (!session || !packet || !session.connected)
        throw new Error("The peer disconnected. Reconnect before joining.");
      session.accepted = true;
      session.pending = undefined;
      useClubStore.getState().mergePacket(packet);
      setPreview(null);
      send(session);
      setStatus("Connected through Tor · club sync active");
      return packet.club.id;
    },
  };
}
