import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

test("offline booking page to host confirmation and private meeting notes", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "calender:events:v1",
      JSON.stringify({
        version: 3,
        state: {
          events: [
            {
              id: "private-event",
              title: "PRIVATE SEMINAR NEVER SHARE",
              note: "PRIVATE CLASS NOTES",
              date: "2026-10-28",
              start: 540,
              end: 600,
              allDay: false,
              color: "purple",
              calendarId: "classes",
            },
          ],
        },
      }),
    );
  });
  await page.goto("/scheduling/");
  await page.getByRole("tab", { name: "Availability", exact: true }).click();
  await page
    .getByLabel("Your name for guests", { exact: true })
    .fill("Alex Student");
  await page
    .getByRole("button", { name: "Save availability", exact: true })
    .click();
  await page
    .getByRole("button", { name: "New meeting type", exact: true })
    .click();
  await page
    .getByLabel("Session name", { exact: true })
    .fill("Biology office hours");
  await page
    .getByLabel("Location or meeting link", { exact: true })
    .fill("Campus Library, Room 204");
  await page
    .getByRole("button", { name: "Save meeting type", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Meeting types", exact: true }).click();
  await page.getByRole("button", { name: "Share times", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save standalone booking page", exact: true })
    .click();
  const html = (await readFile((await (await download).path())!)).toString();
  expect(html).not.toContain("PRIVATE SEMINAR NEVER SHARE");
  expect(html).not.toContain("PRIVATE CLASS NOTES");
  const guest = await context.browser()!.newContext({ offline: true });
  const booking = await guest.newPage();
  await booking.setContent(html);
  await booking.locator("#times button").first().click();
  await booking.getByLabel("Your name", { exact: true }).fill("Guest Student");
  await booking
    .getByLabel("What would you like to discuss? (optional)", { exact: true })
    .fill("Review the lab report");
  await booking
    .getByRole("button", { name: "Prepare booking request", exact: true })
    .click();
  const requestDownload = booking.waitForEvent("download");
  await booking
    .getByRole("button", { name: "Save booking request", exact: true })
    .click();
  const requestBuffer = await readFile((await (await requestDownload).path())!);
  expect(JSON.parse(requestBuffer.toString()).status).toBe("pending");
  await guest.close();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByLabel("Import scheduling file", { exact: true })
    .setInputFiles({
      name: "request.json",
      mimeType: "application/json",
      buffer: requestBuffer,
    });
  await page
    .getByRole("button", { name: "Add to booking inbox", exact: true })
    .click();
  await expect(page.getByText("pending", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("confirmed", { exact: true })).toBeVisible();
  const events = await page.evaluate(
    () => JSON.parse(localStorage.getItem("calender:events:v1")!).state.events,
  );
  expect(events).toHaveLength(2);
  expect(
    events.some((e: { title: string }) => e.title.includes("Guest Student")),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Meeting notes", exact: true })
    .click();
  await expect(page.getByLabel("Markdown note", { exact: true })).toHaveValue(
    /## Agenda/,
  );
  await page
    .getByLabel("Markdown note", { exact: true })
    .fill("# Office hours\n\nPrivate reflection #biology\n\n[[Revision plan]]");
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Office hours", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Markdown note", { exact: true })).toHaveValue(
    /Private reflection/,
  );
});

test("notes autosave, backlinks, rename, trash recovery, vault and encrypted backup", async ({
  page,
}) => {
  await page.goto("/notes/");
  await page.getByRole("button", { name: "New note", exact: true }).click();
  await page
    .getByLabel("Note name or path", { exact: true })
    .fill("Biology/Lecture.md");
  await page.getByRole("button", { name: "Create note", exact: true }).click();
  await page
    .getByLabel("Markdown note", { exact: true })
    .fill(
      "# Cell biology\n\nSee [[Concepts]] #biology\n\n- [ ] Review mitochondria\n\n![blocked](https://example.org/track.png)",
    );
  let remoteRequests = 0;
  page.on("request", (r) => {
    if (r.url().startsWith("https://example.org/")) remoteRequests++;
  });
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cell biology", exact: true }),
  ).toBeVisible();
  expect(remoteRequests).toBe(0);
  await page.getByRole("button", { name: "Concepts", exact: true }).click();
  await expect(page.getByLabel("Note path", { exact: true })).toHaveValue(
    "Biology/Concepts.md",
  );
  await page
    .getByLabel("Markdown note", { exact: true })
    .fill("Connected to [[Lecture]]. #revision");
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await page
    .locator(".note-library")
    .getByRole("button", { name: /Lecture/ })
    .click();
  await page.getByLabel("Note path", { exact: true }).fill("Biology/Week 1.md");
  await page.getByLabel("Note path", { exact: true }).press("Tab");
  await expect(page.getByLabel("Note path", { exact: true })).toHaveValue(
    "Biology/Week 1.md",
  );
  await page
    .locator(".note-library")
    .getByRole("button", { name: /Concepts/ })
    .click();
  await expect(page.getByLabel("Markdown note", { exact: true })).toHaveValue(
    /\[\[Biology\/Week 1\]\]/,
  );
  await page
    .getByRole("button", { name: "Move note to trash", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show note trash", exact: true })
    .click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await page
    .getByRole("button", { name: "Show active notes", exact: true })
    .click();
  await expect(
    page.locator(".note-library").getByRole("button", { name: /Concepts/ }),
  ).toBeVisible();
  const vault = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export Markdown vault ZIP", exact: true })
    .click();
  const zip = await readFile((await (await vault).path())!);
  expect(zip.subarray(0, 2).toString()).toBe("PK");
  await page.getByLabel("Import note files", { exact: true }).setInputFiles({
    name: "vault.zip",
    mimeType: "application/zip",
    buffer: zip,
  });
  await page.getByRole("button", { name: "Import notes", exact: true }).click();
  await expect(page.locator(".note-list-item")).toHaveCount(4);
  await page.goto("/settings/");
  await page.getByRole("tab", { name: "Backups", exact: true }).click();
  await page
    .getByLabel("Backup password", { exact: true })
    .fill("academic private backup");
  const backup = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const envelope = JSON.parse(
    (await readFile((await (await backup).path())!)).toString(),
  );
  expect(envelope.format).toBe("calender-encrypted");
  expect(JSON.stringify(envelope)).not.toContain("Cell biology");
});

test("club members coordinate through ordinary peer-shareable records", async ({
  page,
}) => {
  await page.goto("/clubs/");
  await page.getByRole("button", { name: "New club", exact: true }).click();
  await page
    .getByLabel("Club name", { exact: true })
    .fill("Biology study group");
  await page.getByRole("button", { name: "Create club", exact: true }).click();
  await page.goto("/scheduling/");
  await page.getByRole("tab", { name: "Coordination", exact: true }).click();
  await page
    .getByRole("button", { name: "New meeting poll", exact: true })
    .click();
  await page.getByLabel("Meeting title", { exact: true }).fill("Lab planning");
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(14, 0, 0, 0);
  const local = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`;
  await page.getByLabel("Option 1", { exact: true }).fill(local(date));
  date.setHours(16);
  await page.getByLabel("Option 2", { exact: true }).fill(local(date));
  await page.getByRole("button", { name: "Create poll", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /Available/ })
    .first()
    .check();
  await expect(
    page.getByText("1 response · Select every time that works for you", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/clubs/");
  await expect(
    page.getByRole("heading", { name: "Lab planning", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Choose time", exact: true })
    .first()
    .click();
  await expect(page.getByText("Chosen", { exact: true })).toBeVisible();
  const clubs = await page.evaluate(
    () => JSON.parse(localStorage.getItem("calender:clubs:v1")!).state.clubs,
  );
  expect(
    clubs[0].records.filter((r: { type: string }) => r.type === "event"),
  ).toHaveLength(1);
});

test("scheduling and notes stay accessible and fit desktop, tablet and phone", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of ["/notes/", "/scheduling/"]) {
      await page.goto(route);
      await expect(page.locator("#main-content h1")).toBeVisible();
      await expect(
        page.getByText(/Saved (notes|scheduling data) could not be opened/),
      ).toHaveCount(0);
      await expect(page.locator(".page-enter")).toHaveCSS("opacity", "1");
      if (route === "/scheduling/")
        for (const section of [
          "Meeting types",
          "Bookings",
          "Availability",
          "Coordination",
        ]) {
          await page.getByRole("tab", { name: section, exact: true }).click();
          await expect(page.getByRole("tabpanel")).toHaveCSS("opacity", "1");
          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          expect(
            results.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
            `${section} ${viewport.width}`,
          ).toEqual([]);
        }
      else {
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          results.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ).toEqual([]);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
});
