# Scheduling and notes

Candid keeps both workspaces on your device. There is no account, hosted booking service, email delivery, or cloud notes service.

## Share office hours or a study session

1. Open **Scheduling → Availability**, enter the name guests should see, and set your weekly hours. Hours use this device's timezone.
2. Create a **meeting type**. Choose a duration, description, location, course calendar, buffer, minimum notice, and booking horizon.
3. Choose **Share times → Save standalone booking page**. Send the HTML file using a channel you trust. It works offline in a desktop browser without Candid. Alternatively, share the schedule JSON or code with another Candid user.
4. The guest selects a time and saves a booking request JSON file. They return that file to you; downloading it does not reserve the time.
5. Import the request in **Scheduling** and review it under **Bookings**. Confirming checks your current calendar, availability, meeting type, timezone, and schedule expiry again before creating an event.
6. Send the guest the confirmed calendar `.ics` file yourself. It uses UTC timestamps so calendar apps can display the meeting in the guest's timezone. Candid does not send notifications. Tell the guest directly if you decline, move, or cancel a meeting.

Shared pages are snapshots. Newly busy times do not disappear from files already sent. Share a fresh page after changing your availability; a stale or conflicting request cannot be confirmed. Refresh the page when its booking horizon expires. All personal calendars, including hidden ones and all-day events, block offered times. Multiple pending requests can ask for the same time; confirmation prevents a second conflicting booking.

A schedule file includes your chosen host name, session title, description, duration, location, timezone, and available slots. It excludes personal event titles, busy-event details, notes, assignments, and other meeting types. A returned request includes the guest's name, optional contact/message, and chosen slot. Files are readable and are not identity verification. Preview untrusted requests before accepting them. The standalone page makes no network requests, loads no remote resources, and saves nothing to browser storage.

## Coordinate a club meeting

Create or join a club, then open **Scheduling → Coordination**. Propose several times, and members can mark every time that works. The proposal creator can choose a final time, which becomes a club event. Each member can explicitly copy that event into their personal calendar from **Clubs**.

Proposals and votes use the existing club records. Exchange club JSON files, or keep **Clubs** open while using its LAN/Tor peer connection. Leaving Clubs closes that live connection; local votes can be exchanged afterward. Personal availability and notes never enter club packets. Club members have equal trusted-peer edit access; this is not an authenticated university membership or permissions system. See [peer limits](../README.md#local-club-collaboration) and [Tor setup](TOR_SETUP.md).

## Write and connect notes

Open **Notes** to create plain Markdown notes. Use paths such as `Biology/Lecture 01.md` to organize folders, pin useful notes, search text, and filter by tags. Daily notes use today's date. Notes autosave locally after a short pause and when leaving the editor; check the saved status and any storage warning.

Switch between **Write** and **Read**. Reading supports Markdown headings, lists, tables, code, and task lists. Use `[[Other note]]`, `[[Folder/Other note]]`, or `[[Other note|display text]]` for links. Click a missing wiki link to create its note. Backlinks show other notes that link to the current one. Renaming a note updates its resolved wiki links. Ambiguous filenames need a folder path. Heading fragments are retained in text; navigation opens the note rather than scrolling to the heading.

Notes can link to a course or calendar event. A confirmed booking's **Meeting notes** action creates or opens its private linked note. Trashed notes can be restored. No note content is automatically shared with club peers or scheduling guests.

## Move notes to or from Obsidian

Import individual `.md` files or a ZIP containing your vault's Markdown files. Review the import first. Existing paths are kept and incoming duplicates receive a numbered suffix. Export a single note or the active vault as a ZIP of ordinary Markdown files with folder paths. Trash is excluded from the vault ZIP; full planner backups retain it.

This is Obsidian-style Markdown interchange, not an Obsidian plugin or a live folder connection. Import/export again to transfer changes. Images, attachments, `.obsidian` settings, plugin data, advanced frontmatter, transclusions, graph views, and live filesystem watching are not implemented. Imported text is retained, but unsupported syntax may display literally. Raw HTML is not executed; images are placeholders so reading notes cannot trigger remote tracking requests. Wiki links support internal navigation; ordinary Markdown links are intended for safe external HTTPS destinations.

The vault holds up to 1,000 notes and 4 MB of text, with 100,000 characters per note. Import ZIPs must be under 10 MB; decompression and note paths are bounded and validated. Hidden files and non-Markdown files are ignored. An export contains note text and paths; course/event associations and pins are retained by a full planner backup, not by Markdown ZIPs.

## Backup and privacy

**Settings & backups** now includes notes, trash, availability, meeting types, shared schedule snapshots, and booking history alongside the existing planner and clubs. Older backups remain supported. Imports merge matching IDs; a conflicting active note path is rejected before changes are applied. Scheduling settings from the backup replace current host hours and name. Use a password-encrypted backup for private transfers or recovery; there is no password recovery.

App storage itself is not encrypted at rest. Browser and desktop installations have separate data, and clearing app data removes it. These features need no network connection for ordinary use. Explicitly opened external links, maps, Canvas fetches, and club peer connections retain their existing network behavior.
