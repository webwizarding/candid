# Changelog

## Unreleased

- Prepared Microsoft Artifact Signing through GitHub OIDC, including the app, setup, helper binaries and embedded uninstaller.
- Blocked Windows release uploads without configured, valid Public Trust publisher signatures, timestamps and matching signing receipts.
- Added passing Windows signing-policy checks and a publisher-setup guide. The existing 0.1.4 installer remains unsigned; a signed replacement still requires Microsoft identity validation and account configuration.

## 0.1.4 — 2026-10-28

- Added **Settings → Privacy → Reset Candid** for a full local fresh start: planner, assignments, calendars, notes and trash, clubs and peer identity, scheduling, focus history and preferences.
- Added a backup shortcut, a data summary and a required `RESET` confirmation. Reset restarts the app, clears undo history, blocks late autosaves and refreshes other open Candid tabs.
- Added cancellation, reset failure recovery, multi-tab, persistence and accessibility regression checks.
- Simplified release downloads to one Windows installer and one macOS Apple Silicon disk image. Licenses remain bundled; source and documentation remain in the repository.

## 0.1.3 — 2026-10-28

- Added a scheduling dashboard with academic meeting templates, weekly availability, buffers, notice periods, and booking horizons.
- Added standalone offline booking pages, schedule files/codes, guest request imports, fresh conflict checks, host confirmation, and UTC calendar exports. No hosted service or automatic email delivery is used.
- Added club meeting proposals and availability votes that reuse existing peer sync and club file handoffs.
- Added local Markdown notes with folders, daily notes, tags, wiki links, backlinks, rename updates, course/event links, meeting notes, and recoverable trash.
- Added Markdown vault ZIP import/export for Obsidian interchange, bounded decompression, safe reading without remote image loads, and encrypted-backup coverage for both workspaces.
- Added responsive, accessible workspace layouts and end-to-end checks for the offline guest-to-host flow, notes, and club coordination.
- Added searchable offline help in Settings, with plain explanations for booking files, Canvas imports, notes, club sharing and backups.

## 0.1.2 — 2026-10-28

- Added optional desktop Tor pairing through a separately installed C Tor runtime. Hosting uses SAFECOOKIE control authentication and temporary, self-probed v3 onion services.
- Added single-use, ten-minute invites, Noise-authenticated encrypted club snapshots, guest review before merging, and explicit session cleanup.
- Kept Tor off during ordinary calendar use, with no bundled runtime, DNS lookup of onion addresses, silent network fallback or invite persistence.
- Added accessible transport tabs, active Tor status, runtime setup instructions and protocol/browser regression tests.
- Verified bidirectional synthetic club transfer and the full host flow over two independent local Tor runtimes. Physical cross-device/campus and Windows runtime checks remain outstanding.

## 0.1.1 — 2026-10-28

- Fixed UCSC Canvas feed requests rejected for a missing user agent; verified with a live feed. Added bounded, validated redirects and actionable HTTP errors.
- Added click-to-load Google map previews, Apple Maps links, and meeting links for virtual locations.
- Made event details wrap long imported notes and render Markdown links legibly.
- Expanded overlapping events into unused columns and sized title/time content to the actual event duration.
- Excluded packaged release folders from source checks.

## 0.1.0 — 2026-10-28

Initial public preview of Candid.

- Local student calendar with day/week/month/agenda views, course calendars, recurring classes, overlap warnings, search, editing and undo/redo.
- Assignments, study-time suggestions, a persistent focus timer and in-app reminders.
- Canvas calendar file imports and on-demand desktop feeds for Instructure-hosted Canvas and UC Santa Cruz.
- Google Maps place search and walking directions from event locations.
- Local club dashboards with snapshot sharing; live peer connections remain experimental.
- Password-encrypted backups, calendar import/export, light/dark themes and reduced-motion-aware transitions.
- Responsive interface with focused settings tabs, anchored navigation and a reference-style header.

This preview is not notarized or publisher-signed. Native installers do not imply that live peer sync or all device configurations have been validated; see VERIFICATION.md.
