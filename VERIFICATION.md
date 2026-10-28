# Candid verification

Verified locally on macOS on 2026-10-28.

| Check | Result |
| --- | --- |
| ESLint | Passed |
| TypeScript | Passed |
| Unit tests | 44 passed |
| Rust Canvas URL validation | 2 passed, including UCSC and lookalike rejection |
| Production static export | Passed |
| Native macOS application build | Passed; app launched successfully |
| Browser workflow tests | 5 passed |
| Accessibility and document overflow | Passed automated WCAG A/AA checks on six pages and all settings tabs at 1440×1000, 768×1024, 390×844 and 320×740 |
| Live peer network test | Not verified; opt-in test skipped in the standard suite |
| Windows binary/runtime | Not tested on this macOS host |

Browser checks cover recurring classes and reload persistence, assignments and encrypted export, keyboard search/create, dark appearance, focus controls, Canvas file-to-task import, and club file transfer including deletion markers without personal data.

The live peer test was attempted with matching Chromium and with explicit IP candidates. Both app peers completed offer/answer signaling but did not establish a channel between isolated browser sessions. An independent manual-pairing control also failed between those sessions; a same-page WebRTC control connected. This does not validate cross-device operation. The pairing UI labels direct sync experimental, and club JSON handoff is tested independently. To test on a suitable LAN host:

```sh
CANDID_TEST_LAN=1 npm run test:e2e -- --grep "two peers"
```

No real Canvas account/feed credentials were provided. File parsing, assignment extraction, and native URL restrictions are tested; authenticated live feed fetching still needs testing with a user's actual feed. Google Maps integration is tested as URL construction and opens on explicit clicks.

The macOS bundle is an unsigned development artifact. Signing/notarization and Windows installer validation remain release work. Automated accessibility checks do not replace screen-reader and physical-device testing. Data in local web storage is not encrypted at rest; password-protected backups are encrypted.

UX follow-up: the desktop hamburger is removed from rendered markup; the sidebar footer stays anchored, the date picker opens on request, day details are optional, and settings use four focused tabs. The interface uses shared spacing/control/readability rules in `docs/UX.md`.

Header/motion follow-up: removed both sidebar branding blocks, aligned the top-bar split with the sidebar, added page context and a header creation action, and verified reduced-motion suppression. Entrance animation timing is allowed to settle before static contrast measurements.
