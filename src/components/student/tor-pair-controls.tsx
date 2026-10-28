"use client";
import { useState, useSyncExternalStore } from "react";
import { Copy, Radio, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/dialogs/field";
import { ExternalLink } from "./external-link";
import type { Club } from "@/lib/clubs";
import { useClubStore } from "@/stores/club-store";
import type { useTorSync } from "@/hooks/use-tor-sync";
const subscribe = () => () => {};
export function TorPairControls({
  tor,
  club,
  onJoin,
}: {
  tor: ReturnType<typeof useTorSync>;
  club?: Club;
  onJoin: (id: string) => void;
}) {
  const native = useSyncExternalStore(
    subscribe,
    () => "__TAURI_INTERNALS__" in window,
    () => false,
  );
  const [code, setCode] = useState("");
  const [socks, setSocks] = useState("9050");
  const [control, setControl] = useState("9051");
  const active = tor.phase !== "off";
  const sharing = useClubStore(
    (s) => s.clubs.find((c) => c.id === tor.sharedClubId)?.name,
  );
  const run = async (action: () => Promise<void> | void) => {
    try {
      await action();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const port = (raw: string) => {
    const n = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(n) || n < 1 || n > 65535)
      throw new Error("Tor ports must be between 1 and 65535.");
    return n;
  };
  return (
    <div
      className="grid gap-4"
      role="group"
      aria-label="Private internet pairing"
    >
      <div className="peer-status" role="status" aria-live="polite">
        <Radio size={16} className="shrink-0" />
        {tor.status}
      </div>
      {active && sharing && (
        <p className="text-sm font-medium [overflow-wrap:anywhere]">
          Sharing: {sharing}
        </p>
      )}
      <p className="text-sm leading-relaxed text-fg-2">
        Share one club through Tor while both apps are online. Your calendars
        and personal assignments stay on this device. A paired peer can read and
        edit the shared club.
      </p>
      {!native && (
        <p className="rounded-lg border border-hairline bg-app p-3 text-sm text-fg-2">
          Open Candid’s desktop app to use Tor pairing. Browser users can use
          Nearby or a club file.
        </p>
      )}
      <details className="rounded-xl border border-hairline bg-app p-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Tor setup & connection ports
        </summary>
        <div className="mt-3 grid gap-3">
          <p className="leading-relaxed text-fg-2">
            Install Tor separately and run it as your user. Hosting requires a
            loopback ControlPort with CookieAuthentication 1; joining requires a
            SOCKS port. Candid reads Tor’s advertised cookie path and uses
            SAFECOOKIE. It does not start Tor or change its settings.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SOCKS port" htmlFor="tor-socks">
              <Input
                id="tor-socks"
                type="number"
                min={1}
                max={65535}
                value={socks}
                disabled={active}
                onChange={(e) => setSocks(e.target.value)}
              />
            </Field>
            <Field label="Control port (host)" htmlFor="tor-control">
              <Input
                id="tor-control"
                type="number"
                min={1}
                max={65535}
                value={control}
                disabled={active}
                onChange={(e) => setControl(e.target.value)}
              />
            </Field>
          </div>
          <ExternalLink
            className="text-brand underline underline-offset-2"
            href="https://www.torproject.org/download/tor/"
          >
            Get the separate Tor runtime
          </ExternalLink>
          <p className="text-xs leading-relaxed text-fg-2">
            Both ports connect only to 127.0.0.1. Tor Browser uses different
            ports and may restrict hosting. Use a standalone Tor runtime for
            hosting.
          </p>
        </div>
      </details>
      {!active && (
        <>
          <Button
            variant="brand"
            disabled={!native || !club}
            onClick={() =>
              void run(() => tor.host(club!, port(control), port(socks)))
            }
          >
            <ShieldCheck /> Create private invite
            {club ? ` for ${club.name}` : ""}
          </Button>
          <p className="text-xs text-fg-2">
            Or join a club using an invite from someone you trust:
          </p>
          <Field label="Tor invite code" htmlFor="tor-invite-remote">
            <Textarea
              id="tor-invite-remote"
              value={code}
              maxLength={2048}
              rows={3}
              spellCheck={false}
              autoComplete="off"
              placeholder="candid-tor-v1:…"
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Button
            disabled={!native || !code.trim()}
            onClick={() =>
              void run(async () => {
                await tor.join(code, port(socks));
                setCode("");
              })
            }
          >
            Connect with invite
          </Button>
        </>
      )}
      {tor.invite && (
        <Field
          label="Share this private invite"
          htmlFor="tor-invite-local"
          hint="Single use. Expires in ten minutes. Anyone with this invite can join this club."
        >
          <Textarea
            id="tor-invite-local"
            value={tor.invite}
            readOnly
            rows={3}
            spellCheck={false}
            onFocus={(e) => e.target.select()}
          />
          <Button
            size="sm"
            onClick={() =>
              void navigator.clipboard
                .writeText(tor.invite)
                .then(() => toast.success("Invite copied"))
                .catch(() =>
                  toast("Select the invite text and copy it manually."),
                )
            }
          >
            <Copy /> Copy invite
          </Button>
        </Field>
      )}
      {tor.preview && (
        <div className="grid gap-3 rounded-xl border border-hairline bg-app p-4">
          <h3 className="text-sm font-semibold [overflow-wrap:anywhere]">
            Join {tor.preview.club.name}?
          </h3>
          <p className="text-sm text-fg-2">
            {tor.preview.club.records.filter((r) => !r.deleted).length} shared
            items. Joining merges this club into your device and enables two-way
            edits.
          </p>
          <Button
            variant="brand"
            onClick={() => void run(() => onJoin(tor.accept()))}
          >
            Join club & sync
          </Button>
        </div>
      )}
      {active && (
        <Button
          onClick={() => {
            tor.stop();
            setCode("");
          }}
        >
          Stop Tor sharing
        </Button>
      )}
      <p className="text-xs leading-relaxed text-fg-2">
        Experimental desktop transport. Traffic uses Tor relays; this is an
        internet connection. Closing this dialog keeps the session; leaving
        Clubs disconnects it. Stopping the session closes the temporary service.
        It cannot erase copies already received by a peer.
      </p>
    </div>
  );
}
