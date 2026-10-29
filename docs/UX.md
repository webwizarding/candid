# Candid UX rules

These rules apply to every student and club screen. Shared styles live in `src/app/globals.css`; use its `--ux-*` tokens rather than inventing new spacing values.

- **Put the task first.** One page title, one short explanation, one primary action. Avoid decorative slogans, repeated status badges and large statistics before the actual work.
- **Show only the current task's controls.** Settings are split into Calendar, Connections, Backups, Privacy and Help. Date selection and calendar day details open on request. Help and edge-case explanations use labeled disclosures.
- **Use consistent space.** Use an 8 / 16 / 24 px rhythm, responsive 16–32 px page gutters and a 40 px control height. Keep related controls together, then separate groups with whitespace.
- **Keep text readable.** Body/control text is 14 px, secondary text generally 12–13 px, with comfortable line spacing. Keep paragraphs around 64 characters wide. Do not solve overflow by shrinking the entire interface.
- **Keep navigation reachable.** Desktop has one permanent sidebar and no duplicate hamburger drawer. The date picker is collapsed; only long course lists scroll. Settings stay anchored at the sidebar bottom. Small screens retain the drawer and bottom navigation because the permanent sidebar is absent.
- **Budget scrolling.** Each page owns one main vertical scroll area; the calendar owns its time-grid scroll. Avoid stacked full-page cards for unrelated settings. Optional side panels must not squeeze the default week view. Let genuinely long lists scroll rather than clipping important content.
- **Use clear disclosure.** Label on-demand actions and explain data effects before an import or merge. Keep sensitive choices, errors and destructive scope visible; move background explanation into help disclosures.
- **Keep interactions accessible.** Preserve visible focus, keyboard operation, semantic labels, error text and reduced-motion behavior. Aim for 44 px primary touch controls, and never identify a state by color alone.
- **Adapt the composition.** Stack cards on small screens, preserve font size, and keep the document free of horizontal overflow. Native window chrome may differ; content fonts, colors and spacing share one design system.

## Motion

Use `--motion-fast` (140 ms), `--motion-base` (220 ms) and `--motion-ease` for a consistent feel. The header keeps a stable sidebar-aligned brand segment, page context and a global creation action. Sidebar branding slogans are omitted.

- Animate opacity and transforms for entrances and feedback; avoid animating layout dimensions or scrolling the document unexpectedly.
- Keep nav staggering bounded to 72 ms. Avoid perpetual decorative motion, large zooms, spring overshoot and extra animation dependencies.
- Hover effects apply to actual controls on fine pointers. Press feedback works on touch. Dragged events retain their existing position logic.
- Respect `prefers-reduced-motion`: disable entrance, stagger and interaction movement while preserving visible state and keyboard focus.
- Page entrances must not remount global timers, storage providers or app-wide dialogs.

Help uses searchable topic groups and collapsed questions. Answers lead with the action, explain manual file handoffs, and link to the relevant workspace. Keep them readable without technical background.

Review changes at 390×844, 768×1024 and 1440×1000. Check settings with the selected panel open, sidebar footer visibility on a 900 px-tall desktop, the date picker, keyboard tab changes and the calendar with optional details both open and closed.
