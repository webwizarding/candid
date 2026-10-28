import { clubPacket, validateClubPacket, type Club } from "./clubs";

type Pairing = {
  format: "calender-pairing";
  version: 1;
  club: { id: string; name: string };
  description: RTCSessionDescriptionInit;
};
export function readPairing(code: string): Pairing {
  if (code.length > 100000) throw new Error("Pairing code is too large.");
  let p: Pairing;
  try {
    p = JSON.parse(code);
  } catch {
    throw new Error("Paste the complete pairing code.");
  }
  if (
    p.format !== "calender-pairing" ||
    p.version !== 1 ||
    !p.club ||
    typeof p.club.id !== "string" ||
    !p.club.id ||
    p.club.id.length > 100 ||
    typeof p.club.name !== "string" ||
    p.club.name.length > 100 ||
    !p.description ||
    !["offer", "answer"].includes(p.description.type) ||
    typeof p.description.sdp !== "string"
  )
    throw new Error("Invalid pairing code.");
  return p;
}

/** Serverless LAN-only WebRTC: no signaling endpoint, STUN server or TURN relay. */
export class ClubPeer {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private incoming = "";
  private receiving = false;
  private pending: string | null = null;
  private sending = false;
  private closed = false;
  private club: { id: string; name: string };
  constructor(
    club: { id: string; name: string },
    private receive: (packet: unknown) => void,
    private status: (message: string) => void,
  ) {
    if (typeof RTCPeerConnection === "undefined")
      throw new Error(
        "Direct peer connections are unavailable in this browser. Use club file handoff instead.",
      );
    this.club = { id: club.id, name: club.name };
    this.pc = new RTCPeerConnection({ iceServers: [] });
    this.pc.ondatachannel = (e) => this.bind(e.channel);
    this.pc.onconnectionstatechange = () =>
      this.status(
        this.pc.connectionState === "connected"
          ? "Connected · direct, encrypted connection"
          : this.pc.connectionState === "failed"
            ? "Local connection failed. Check network isolation, or use club file handoff."
            : `Peer ${this.pc.connectionState}`,
      );
  }
  private bind(channel: RTCDataChannel) {
    this.channel = channel;
    channel.onopen = () =>
      this.status("Connected · direct, encrypted connection");
    channel.onclose = () => this.status("Disconnected");
    channel.onerror = () =>
      this.status("Connection error. Re-pair or use file handoff.");
    channel.onmessage = (e) => {
      try {
        if (typeof e.data !== "string" || e.data.length > 50000)
          throw new Error("Invalid peer message.");
        const message = JSON.parse(e.data);
        if (message.kind === "start") {
          this.incoming = "";
          this.receiving = true;
        } else if (
          message.kind === "chunk" &&
          this.receiving &&
          typeof message.data === "string"
        ) {
          this.incoming += message.data;
          if (this.incoming.length > 2000000)
            throw new Error("Club snapshot exceeds the 2 MB limit.");
        } else if (message.kind === "end" && this.receiving) {
          this.receiving = false;
          const packet = validateClubPacket(JSON.parse(this.incoming));
          this.incoming = "";
          if (packet.club.id !== this.club.id)
            throw new Error("Peer tried to send a different club.");
          this.receive(packet);
          this.status("Synced · direct, encrypted connection");
        } else throw new Error("Unexpected peer message.");
      } catch (error) {
        this.incoming = "";
        this.receiving = false;
        this.status((error as Error).message);
      }
    };
  }
  private async description(): Promise<string> {
    await new Promise<void>((resolve, reject) => {
      if (this.pc.iceGatheringState === "complete") return resolve();
      const timeout = setTimeout(() => {
        this.pc.removeEventListener("icegatheringstatechange", check);
        reject(
          new Error(
            "Local network discovery timed out. Try again or use file handoff.",
          ),
        );
      }, 12000);
      const check = () => {
        if (this.pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          this.pc.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
      };
      this.pc.addEventListener("icegatheringstatechange", check);
    });
    return JSON.stringify({
      format: "calender-pairing",
      version: 1,
      club: this.club,
      description: this.pc.localDescription?.toJSON(),
    });
  }
  async offer() {
    this.bind(this.pc.createDataChannel("calender-club"));
    await this.pc.setLocalDescription(await this.pc.createOffer());
    return this.description();
  }
  async answer(code: string) {
    const pairing = readPairing(code);
    if (
      pairing.club.id !== this.club.id ||
      pairing.description.type !== "offer"
    )
      throw new Error("This offer belongs to another club.");
    await this.pc.setRemoteDescription(pairing.description);
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    return this.description();
  }
  async accept(code: string) {
    const pairing = readPairing(code);
    if (
      pairing.club.id !== this.club.id ||
      pairing.description.type !== "answer"
    )
      throw new Error("Paste the matching answer for this club.");
    await this.pc.setRemoteDescription(pairing.description);
  }
  isOpen() {
    return this.channel?.readyState === "open";
  }
  send(club: Club) {
    if (club.id !== this.club.id) return;
    const value = JSON.stringify(clubPacket(club));
    if (value.length > 2000000) {
      this.status(
        "Club snapshot exceeds 2 MB. Shorten large posts before syncing.",
      );
      return;
    }
    this.pending = value;
    void this.flush();
  }
  private async flush() {
    if (this.sending || !this.isOpen()) return;
    this.sending = true;
    try {
      while (this.pending && this.isOpen() && !this.closed) {
        const value = this.pending;
        this.pending = null;
        const chunks = [
          { kind: "start" },
          ...Array.from(
            { length: Math.ceil(value.length / 12000) },
            (_, i) => ({
              kind: "chunk",
              data: value.slice(i * 12000, (i + 1) * 12000),
            }),
          ),
          { kind: "end" },
        ];
        for (const chunk of chunks) {
          while (
            this.channel!.bufferedAmount > 128000 &&
            this.isOpen() &&
            !this.closed
          )
            await new Promise((r) => setTimeout(r, 25));
          if (!this.isOpen() || this.closed) break;
          this.channel!.send(JSON.stringify(chunk));
        }
      }
    } catch {
      this.status("Could not send the snapshot. Reconnect to sync again.");
    } finally {
      this.sending = false;
    }
  }
  close() {
    this.closed = true;
    this.pending = null;
    this.channel?.close();
    this.pc.close();
  }
}
