# Private internet pairing proposal

Status: architecture reference. The optional C Tor adapter is implemented in the working source; see TOR_SETUP.md for actual controls, setup and verification limits. I2P, QR codes and bundled runtimes are not implemented. The original proposal below describes the intended design; the setup guide identifies current behavior.

## Intended experience

Add a transport choice inside **Clubs → Pair & sync**:

- **Nearby:** retain the existing local-network pairing.
- **Private internet:** Tor onion-service transport, available in the desktop app.
- **Club file:** retain export/import as an asynchronous fallback.

The proposed first Tor implementation connects to a separately installed, local Tor runtime so ordinary calendar use does not carry a bundled Tor engine or start it automatically. Bundling an engine is an alternative product decision, not a requirement of the protocol. I2P can implement the same club transport interface through a local SAM bridge later.

## Host and join

1. The host selects one club and explicitly starts private internet sharing.
2. Candid checks the local Tor runtime, creates a temporary onion service, and shows connection progress. A generated address is not proof that the service is reachable: show **Waiting for peer** only after service readiness, and **Connected** only after the authenticated application handshake succeeds.
3. Candid creates an expiring, single-use invite containing the protocol version, onion endpoint and a cryptographically random access secret. Share it as copyable text or a QR code generated locally. Do not include club contents, personal calendars, personal assignments or profile information in the invite.
4. The joining desktop app validates the invite, connects through its local Tor runtime, authenticates the session and displays the club identity for confirmation before merging records. Reject expired, reused or malformed invites.
5. Both peers exchange only the selected club using the existing validated ClubPacket format and deterministic merge/tombstone rules. Changes are exchanged while both peers are connected.
6. **Stop sharing**, leaving Clubs, or quitting Candid closes the connection and destroys the temporary service. Regenerating an invite invalidates the previous one. Ending a connection cannot erase data already copied by a peer.

Start with one host and one guest, matching the current pairing scope. Do not imply club accounts, verified identities, membership administration or read-only permissions: current paired peers have equal edit access.

## Access-code constraints

A self-contained invite must carry enough information to locate a peer and authenticate access. A v3 onion address alone contains 56 characters before `.onion`. Adding a strong random secret makes the invite longer; a QR code can hide that complexity without a discovery server.

A six-digit code alone is neither a peer address nor a strong standalone secret. Supporting short memorable codes would require a separately designed rendezvous/directory mechanism and an appropriate password-authenticated protocol with abuse controls. Tor and I2P do not automatically provide that Candid-specific lookup service. Do not truncate the address or access secret to make a short code.

## Native transport boundary

The current ClubPeer implementation uses RTCPeerConnection with no signaling, STUN or TURN service. Its local-network discovery is not a Tor transport. The new mode needs a separate native stream transport, exposed through narrowly scoped Tauri commands/events; the webview must not try to resolve onion addresses or run the existing WebRTC connection in this mode.

Tor option: use supported Tor/Arti APIs for creating and connecting to onion services. If integrating an external C Tor control port, require authenticated loopback control, authenticate it safely, restrict control operations to the temporary Candid service, and leave the user's Tor configuration and other services untouched. Resolve onion destinations through Tor; never through ordinary DNS. A failed Tor connection must not fall back to clearnet or LAN silently.

I2P option: use the official SAM stream interface to the user's local router. Support it as a separate transport with explicit router readiness checks and destination validation. Do not describe SAM access or a local router as automatic Candid authentication.

Both options need a reviewed authenticated session protocol using maintained libraries, bounded frames/snapshots, bounded peer count and timeouts, cancellation, backpressure and reconnect behavior. Authenticate before accepting club metadata or records. Never log invites, access secrets or club packet bodies; keep temporary credentials out of planner backups, analytics, exported club files and ordinary persistent settings.

## Privacy and operating limits

This is local storage with private internet transport. It uses public overlay-network relays, so it is not a LAN-only mode or an offline connection. Relays are not a Candid-hosted calendar database. Do not promise complete anonymity, instant connection or access through every campus firewall.

Both peers need a running, ready runtime and an internet connection. Initially, both apps must remain online to synchronize; there is no offline mailbox or hosted copy. Startup latency and ongoing network/CPU activity belong only to the explicitly selected private transport. Calendar rendering and ordinary offline use remain independent.

## Acceptance checks before release

- A real macOS peer and Windows peer can host/join across separate networks through the chosen overlay, exchange edits and propagate deletion markers.
- No personal events, assignments, planner backups or non-selected clubs enter transport messages.
- Wrong secrets, modified frames, expired/reused invites, wrong club IDs, oversized packets, interrupted downloads and unexpected disconnects fail without merging untrusted data.
- Stopping a session, leaving Clubs, quitting the app and cancellation during bootstrap remove listeners/services and invalidate the invite.
- Runtime missing, runtime starting, network blocked and service unreachable have distinct readable states; none show a successful pairing.
- Verify no ordinary DNS resolution, direct-IP retry, unwanted clearnet fallback, secret logging or Tor/I2P startup during ordinary calendar use.
- Test actual overlay behavior as well as mocked transport tests. A local simulated connection must not be reported as validated Tor/I2P operation.

## Primary references

- Tor onion-service architecture, end-to-end encryption, endpoint identity and NAT traversal: https://community.torproject.org/onion-services/overview/
- Tor control protocol, including temporary onion-service lifecycle: https://spec.torproject.org/control-spec/commands.html
- Arti embedding and current supported features: https://arti.torproject.org/FAQs/
- I2P's supported SAM stream protocol: https://i2p.net/en/docs/api/samv3/
