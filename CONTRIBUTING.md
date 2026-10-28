# Contributing to Candid

Use synthetic calendar data in issues, screenshots and fixtures. Never share private Canvas feed URLs, calendar exports containing personal information, credentials or backup passwords publicly.

Install dependencies with `npm ci`; see README.md for desktop prerequisites. Before proposing a change, run `npm run lint`, `npm run typecheck`, `npm test`, and relevant browser/native tests. Follow docs/UX.md for interface changes. Read AGENTS.md and the bundled Next.js guides before changing framework code.

Preserve original license attribution, keep third-party notices with distributed builds, and regenerate notices with `npm run release:notices` after dependency changes. Do not weaken URL restrictions, peer-data scoping or backup validation to accommodate a single fixture.
