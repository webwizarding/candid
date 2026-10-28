import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

test("recurring class, assignments, persistence and encrypted backups", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your calendar." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New event" }).click();
  await page.getByLabel("Title", { exact: true }).fill("BIO 101 lecture");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-28");
  await page.getByLabel("Repeat weekly").check();
  await page.getByLabel("Repeat until").fill("2026-11-18");
  // The initial repeat weekday follows today. Pick Wednesday explicitly.
  const wed = page.getByRole("button", { name: "Wed", exact: true });
  if ((await wed.getAttribute("aria-pressed")) === "false") await wed.click();
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your calendar." }),
  ).toBeVisible();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("calender:events:v1")!).state.events,
  );
  expect(saved.length).toBeGreaterThanOrEqual(4);
  expect(
    saved.every((e: { title: string }) => e.title === "BIO 101 lecture"),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Assignments", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "New assignment", exact: true })
    .click();
  await page.getByLabel("Assignment", { exact: true }).fill("Lab report");
  await page.getByRole("button", { name: "Save assignment" }).click();
  await page
    .getByRole("checkbox", { name: "Mark Lab report complete" })
    .click();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lab report", exact: true }),
  ).toBeVisible();
  await page.goto("/settings/");
  await page.getByRole("tab", { name: "Backups", exact: true }).click();
  await page
    .getByLabel("Backup password", { exact: true })
    .fill("private test password");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.candid$/);
});

test("accessible desktop, phone and tablet routes have no document overflow", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of [
      "/",
      "/assignments/",
      "/agenda/",
      "/focus/",
      "/clubs/",
      "/settings/",
    ]) {
      await page.goto(route);
      await expect(page.locator("#main-content h1")).toBeVisible();
      await expect(page.locator(".page-enter")).toHaveCSS("opacity", "1");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        `${route} at ${viewport.width}`,
      ).toEqual([]);
      if (route === "/settings/") {
        for (const section of ["Connections", "Backups", "Privacy"]) {
          await page.getByRole("tab", { name: section, exact: true }).click();
          await expect(page.locator(".settings-panel:visible")).toHaveCSS(
            "opacity",
            "1",
          );
          const panelResults = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          expect(
            panelResults.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
            `${section} at ${viewport.width}`,
          ).toEqual([]);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
        }
      }
      if (route === "/") {
        const examples = page.getByRole("button", { name: "Try examples" });
        if (await examples.isVisible()) await examples.click();
        if (viewport.width === 1440 || viewport.width === 390)
          await page.screenshot({
            path: `artifacts/candid-${viewport.width === 1440 ? "desktop" : "mobile"}.png`,
            animations: "disabled",
          });
      }
    }
  }
});

test("keyboard create, search, theme and focus timer", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#main-content h1")).toBeVisible();
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Toggle light or dark theme" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: "artifacts/candid-header-dark.png",
    animations: "disabled",
  });
  await page.goto("/focus/");
  await page.getByRole("button", { name: "Start session" }).click();
  await page.getByRole("button", { name: "Pause session" }).click();
  await expect(
    page.getByRole("button", { name: /Resume session|Start session/ }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/agenda/");
  await expect(page.locator(".page-enter")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".student-nav-link").first()).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("two peers sync only their club and propagate deletion", async ({
  browser,
}) => {
  test.skip(
    !process.env.CANDID_TEST_LAN,
    "Requires a host permitting UDP between isolated browser sessions; file handoff is tested separately.",
  );
  const a = await browser.newContext();
  const b = await browser.newContext();
  for (const context of [a, b])
    await context.addInitScript(() => {
      const NativePeer = window.RTCPeerConnection;
      const store: RTCPeerConnection[] = [];
      Object.assign(window, { __testPeers: store });
      window.RTCPeerConnection = class extends NativePeer {
        constructor(config?: RTCConfiguration) {
          super(config);
          store.push(this);
        }
      };
    });
  const host = await a.newPage();
  const guest = await b.newPage();
  await host.goto("/clubs/");
  await guest.goto("/clubs/");
  await host.getByRole("button", { name: "New club", exact: true }).click();
  await host.getByLabel("Club name", { exact: true }).fill("Film Society");
  await host.getByRole("button", { name: "Create club", exact: true }).click();
  await host
    .getByRole("button", { name: "Add club task", exact: true })
    .click();
  await host.getByLabel("Title", { exact: true }).fill("Book screening room");
  await host.getByRole("button", { name: "Save to club", exact: true }).click();
  await host.getByRole("button", { name: "Pair & sync" }).click();
  await host.getByRole("button", { name: /Create offer for/ }).click();
  await expect(host.locator("#peer-code")).toBeVisible({ timeout: 20000 });
  const offer = await host.locator("#peer-code").inputValue();
  await guest.getByRole("button", { name: "Pair & sync" }).click();
  await guest.locator("#peer-remote").fill(offer);
  await guest
    .getByRole("button", { name: "Join offer & create answer" })
    .click();
  await expect(guest.locator("#peer-code")).toBeVisible({ timeout: 20000 });
  await host
    .locator("#peer-remote")
    .fill(await guest.locator("#peer-code").inputValue());
  await host
    .getByRole("button", { name: "Accept peer’s answer", exact: false })
    .click();
  try {
    await expect(
      guest.getByRole("status").filter({ hasText: /Synced|Connected/ }),
    ).toBeVisible({ timeout: 12000 });
  } catch (error) {
    for (const page of [host, guest])
      console.log(
        await page.evaluate(() =>
          (
            window as unknown as { __testPeers: RTCPeerConnection[] }
          ).__testPeers.map((p) => ({
            state: p.connectionState,
            ice: p.iceConnectionState,
            signaling: p.signalingState,
            localType: p.localDescription?.type,
            remoteType: p.remoteDescription?.type,
          })),
        ),
      );
    throw error;
  }
  await host.getByRole("button", { name: "Back to dashboard" }).click();
  await guest.getByRole("button", { name: "Back to dashboard" }).click();
  await expect(
    guest.getByRole("heading", { name: "Book screening room" }),
  ).toBeVisible();
  await guest
    .getByRole("button", { name: "Delete Book screening room", exact: true })
    .click();
  await expect(
    host.getByRole("heading", { name: "Book screening room" }),
  ).toHaveCount(0);
  expect(
    await guest.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("calender:events:v1") ||
            '{"state":{"events":[]}}',
        ).state.events,
    ),
  ).toEqual([]);
  await a.close();
  await b.close();
});

test("club file handoff merges updates and deletions without personal data", async ({
  browser,
}) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const host = await a.newPage();
  const guest = await b.newPage();
  await host.goto("/clubs/");
  await guest.goto("/clubs/");
  await host.getByRole("button", { name: "New club", exact: true }).click();
  await host.getByLabel("Club name", { exact: true }).fill("Film Society");
  await host.getByRole("button", { name: "Create club", exact: true }).click();
  await host
    .getByRole("button", { name: "Add club task", exact: true })
    .click();
  await host.getByLabel("Title", { exact: true }).fill("Book screening room");
  await host.getByRole("button", { name: "Save to club", exact: true }).click();
  const handoff = async () => {
    const waiting = host.waitForEvent("download");
    await host
      .getByRole("button", { name: "Export club", exact: true })
      .click();
    const file = await waiting;
    const buffer = await readFile((await file.path())!);
    const packet = JSON.parse(buffer.toString());
    expect(Object.keys(packet).sort()).toEqual(["club", "format", "version"]);
    await guest.getByLabel("Import club snapshot").setInputFiles({
      name: "candid-club.json",
      mimeType: "application/json",
      buffer,
    });
    await guest.getByRole("button", { name: "Merge club snapshot" }).click();
  };
  await handoff();
  await expect(
    guest.getByRole("heading", { name: "Book screening room" }),
  ).toBeVisible();
  await host
    .getByRole("button", { name: "Delete Book screening room", exact: true })
    .click();
  await handoff();
  await expect(
    guest.getByRole("heading", { name: "Book screening room" }),
  ).toHaveCount(0);
  const personal = await guest.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("calender:events:v1") || '{"state":{"events":[]}}',
      ).state.events,
  );
  expect(personal).toEqual([]);
  await a.close();
  await b.close();
});

test("Canvas file import recognizes a deadline as a task", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByRole("tab", { name: "Connections", exact: true }).click();
  const buffer = Buffer.from(
    "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:assignment-123\r\nDTSTART:20261028T230000\r\nSUMMARY:Canvas lab report\r\nURL:https://school.instructure.com/courses/1/assignments/123\r\nEND:VEVENT\r\nEND:VCALENDAR",
  );
  await page
    .getByLabel("Import Canvas calendar file")
    .setInputFiles({ name: "canvas.ics", mimeType: "text/calendar", buffer });
  await expect(
    page.getByRole("heading", { name: "Review Canvas calendar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Import into Candid" }).click();
  await page.goto("/assignments/");
  await expect(
    page.getByRole("button", { name: "Canvas lab report", exact: true }),
  ).toBeVisible();
});

test("event details wrap imported notes and maps load only on request", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const date = new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const base = {
      date: key,
      allDay: false,
      color: "orange",
      calendarId: "personal",
    };
    localStorage.setItem(
      "calender:events:v1",
      JSON.stringify({
        version: 3,
        state: {
          events: [
            {
              ...base,
              id: "meeting-test",
              title:
                "Office hours with a long imported course title for readability",
              start: 540,
              end: 600,
              location: "Zoom Online Meeting",
              note:
                "[Join office hours](https://example.zoom.us/j/123456789)\n" +
                "unbroken".repeat(150),
            },
            {
              ...base,
              id: "map-test",
              title: "Library study session",
              start: 600,
              end: 660,
              location: "McHenry Library, Santa Cruz",
            },
            {
              ...base,
              id: "short-test",
              title: "Quick check-in",
              start: 660,
              end: 675,
            },
          ],
        },
      }),
    );
  });
  let requests = 0;
  await page.route("https://maps.google.com/**", async (route) => {
    requests++;
    await route.fulfill({
      contentType: "text/html",
      body: "<p>Map preview</p>",
    });
  });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const meeting = page.locator('[data-event-id="meeting-test"]').first();
    await meeting.scrollIntoViewIfNeeded();
    await meeting.click();
    const details = page.locator('[data-slot="popover-content"]');
    await expect(
      details.getByRole("link", { name: "Join meeting", exact: true }),
    ).toBeVisible();
    await expect(
      details.getByRole("button", { name: "Show map", exact: true }),
    ).toHaveCount(0);
    await expect(
      details.getByRole("link", { name: "Join office hours", exact: true }),
    ).toBeVisible();
    expect(
      await details.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(details).toHaveCount(0);
    const short = page.locator('[data-event-id="short-test"]').first();
    expect((await short.boundingBox())!.height).toBeLessThanOrEqual(16);
    const physical = page.locator('[data-event-id="map-test"]').first();
    await physical.scrollIntoViewIfNeeded();
    await physical.click();
    await expect(
      details.getByRole("link", { name: "Apple Maps", exact: true }),
    ).toBeVisible();
    await expect(details.locator("iframe")).toHaveCount(0);
    const before = requests;
    await details
      .getByRole("button", { name: "Show map", exact: true })
      .click();
    await expect(details.locator("iframe")).toHaveAttribute(
      "src",
      /maps.google.com\/maps\?q=McHenry/,
    );
    await expect.poll(() => requests).toBe(before + 1);
    expect(
      await details.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await details
      .getByRole("button", { name: "Close map", exact: true })
      .click();
    await expect(details.locator("iframe")).toHaveCount(0);
  }
});
