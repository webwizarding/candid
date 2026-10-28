# Tor pairing (experimental desktop mode)

Candid connects to a separately installed **C Tor** runtime. It does not bundle or start Tor, enable a login service, edit torrc, or route other calendar features through Tor. The browser preview cannot make these native connections. Arti and I2P are not supported by this adapter.

## macOS

Install Tor from a trusted package manager, for example `brew install tor`. In a Terminal window, run a dedicated client instance:

```sh
mkdir -p "$HOME/Library/Application Support/CandidTor"
touch "$HOME/Library/Application Support/CandidTor/torrc"
tor -f "$HOME/Library/Application Support/CandidTor/torrc" --DataDirectory "$HOME/Library/Application Support/CandidTor" \
  --SocksPort 127.0.0.1:9050 --ControlPort 127.0.0.1:9051 --CookieAuthentication 1
```

Wait for **Bootstrapped 100%**. Keep that Terminal running during pairing. Press Control-C there to stop Tor when finished. These commands do not enable automatic startup or a public relay.

## Windows

Download Tor's Expert Bundle from [the Tor Project](https://www.torproject.org/download/tor/) and follow its verification instructions. Extract it and locate `tor.exe`. In PowerShell, create a dedicated configuration:

```powershell
$torData = Join-Path $env:LOCALAPPDATA 'CandidTor'
New-Item -ItemType Directory -Force $torData | Out-Null
$torConfig = Join-Path $torData 'torrc'
@"
DataDirectory "$($torData.Replace('\', '/'))"
SocksPort 127.0.0.1:9050
ControlPort 127.0.0.1:9051
CookieAuthentication 1
"@ | Set-Content -Path $torConfig -Encoding ascii
& 'C:\path\to\tor.exe' -f $torConfig
```

Replace the executable path with your extracted `tor.exe`. Wait for **Bootstrapped 100%** and keep PowerShell running during pairing. Control-C stops this runtime. Candid and Tor must run as the same Windows user so Candid can read Tor's advertised control cookie.

## Pair one club

1. Open **Clubs → Pair & sync → Private internet · Tor** in the desktop app.
2. Hosting requires both SOCKS and authenticated control access. Joining requires SOCKS access. Open **Tor setup & connection ports** if your runtime uses ports other than 9050/9051. Both endpoints are restricted to IPv4 loopback, `127.0.0.1`.
3. The host selects a club and clicks **Create private invite**. Candid authenticates the control port with SAFECOOKIE, creates a temporary v3 onion service, and verifies that Tor can reach it. Publication can take time; cancellation remains available.
4. Share the full invite privately. It carries the onion address, a random 256-bit key, club identifier and expiry. It is single-use and expires ten minutes after publication. A short numeric code cannot replace it. Candid does not provide a lookup service or QR generation in this implementation.
5. The guest pastes the invite and clicks **Connect with invite**. A Noise NNpsk0 handshake authenticates the shared key and establishes an encrypted stream. The guest reviews the club and clicks **Join club & sync** before records merge into local storage or local edits are sent back.
6. Both people can edit the shared club. Only that club's events, tasks, posts and deletion markers are exchanged, with a 2 MB snapshot limit. Personal events, assignments and backups are not sent.

Closing the pairing dialog keeps the session so you can edit the dashboard. Leaving Clubs, reloading the desktop webview, selecting Nearby, **Stop Tor sharing**, or quitting Candid ends it. The host's ephemeral onion service exists only while its control connection is held; Candid uses neither persistent service keys nor the `Detach` flag. You must make a new invite after a disconnect. Tor itself continues running until you stop it separately.

## Limits and errors

This mode uses internet relays while data remains stored on the participating devices. It is not LAN-only, an offline mailbox, verified club membership, or a promise of anonymity. Both apps and runtimes must stay online. Paired peers have equal read/write access; disconnecting cannot erase data already received.

- **Tor control unavailable:** start C Tor with a loopback ControlPort and CookieAuthentication enabled.
- **Cookie cannot be read:** use the same OS user for both processes and check the runtime's cookie permissions. Candid rejects unauthenticated control and deprecated COOKIE-only authentication.
- **Tor still connecting:** wait for bootstrap to reach 100%.
- **Onion peer unreachable:** keep the host online, check SOCKS settings, and retry after publication. A campus network may block Tor; this adapter does not configure bridges.
- **Invite expired/device clocks disagree:** align system clocks and ask for a fresh invite.
- **Authentication or frame error:** the connection stops; invalid data is not merged. Re-pair using a trusted copy of the invite.

There is no automatic DNS lookup of onion addresses, clearnet/LAN fallback, reconnect, runtime installation or Tor startup. Invites are kept in memory and excluded from app persistence/exports. Copying an invite places it in the system clipboard; clipboard managers may retain it. The standalone Tor runtime keeps its own network state in its chosen data directory, separate from Candid's calendar storage.

## Protocol and verification

Control protocol: [Tor specifications](https://spec.torproject.org/control-spec/commands.html). Application channel: Snow's `Noise_NNpsk0_25519_ChaChaPoly_SHA256`, with a club-specific prologue, encrypted confirmation, ordered AEAD frames, bounded snapshots, write timeouts and heartbeat/disconnect detection. The application channel remains encrypted even on the local SOCKS/listener hops. No invite secret, private service key or club packet body is logged by Candid.

Native loopback and mocked-control tests require permission to bind localhost sockets. An opt-in live test uses two independently running Tor clients and synthetic club snapshots; it must not be reported as a physical macOS-to-Windows test. Cross-device and campus-network testing remains required before treating this experimental mode as validated on those environments.
