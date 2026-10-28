import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Tor is optional and its browser explanation stays accessible on small screens", async ({
  page,
}) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/clubs/");
    await page
      .getByRole("button", { name: "Pair & sync", exact: true })
      .click();
    await page.getByRole("tab", { name: "Private internet · Tor" }).click();
    await expect(
      page.getByText("Open Candid’s desktop app to use Tor pairing.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create private invite", exact: true }),
    ).toBeDisabled();
    await page
      .getByText("Tor setup & connection ports", { exact: true })
      .click();
    await expect(page.getByLabel("SOCKS port", { exact: true })).toHaveValue(
      "9050",
    );
    await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});

test("native bridge contract keeps invites ephemeral and reviews incoming clubs", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const club = { id: "existing-club", name: "Local test club", records: [] };
    localStorage.setItem(
      "calender:clubs:v1",
      JSON.stringify({
        version: 1,
        state: {
          clubs: [club],
          deviceId: "test-device",
          displayName: "Student",
        },
      }),
    );
    localStorage.setItem(
      "calender:events:v1",
      JSON.stringify({
        version: 3,
        state: {
          events: [
            {
              id: "private-event",
              title: "PERSONAL DO NOT SHARE",
              date: "2026-10-28",
              start: 540,
              end: 600,
              allDay: false,
              color: "purple",
              calendarId: "personal",
            },
          ],
        },
      }),
    );
    const calls: Array<{ command: string; args: Record<string, unknown> }> = [];
    const callbacks = new Map<number, (event: unknown) => void>();
    let next = 1;
    let listener: ((event: unknown) => void) | undefined;
    const emit = (payload: unknown) =>
      listener?.({ event: "candid-tor-sync", id: 1, payload });
    Object.assign(window, {
      torCalls: calls,
      __TAURI_EVENT_PLUGIN_INTERNALS__: {
        unregisterListener: () => {
          listener = undefined;
        },
      },
      __TAURI_INTERNALS__: {
        transformCallback: (callback: (event: unknown) => void) => {
          const id = next++;
          callbacks.set(id, callback);
          return id;
        },
        invoke: async (command: string, args: Record<string, unknown>) => {
          calls.push({ command, args });
          if (command === "plugin:event|listen") {
            listener = callbacks.get(args.handler as number);
            return 1;
          }
          if (command === "plugin:event|unlisten") return;
          if (command === "tor_host") {
            const value = {
              onion: "a".repeat(55) + "d.onion",
              key: btoa(
                String.fromCharCode(...new Uint8Array(32).fill(7)),
              ).replace(/=/g, ""),
              clubId: "existing-club",
              expires: Math.floor(Date.now() / 1000) + 600,
            };
            const code =
              "candid-tor-v1:" +
              btoa(JSON.stringify(value))
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=/g, "");
            setTimeout(
              () =>
                emit({
                  id: args.id,
                  state: "invite",
                  message: "Invite ready",
                  data: code,
                }),
              10,
            );
            return;
          }
          if (command === "tor_join") {
            setTimeout(() => {
              emit({
                id: args.id,
                state: "connected",
                message:
                  "Connected through Tor · review the club before joining",
              });
              emit({
                id: args.id,
                state: "packet",
                message: "Club update received through Tor",
                data: JSON.stringify({
                  format: "calender-club",
                  version: 1,
                  club: {
                    id: "incoming-club",
                    name: "Peer test club",
                    records: [],
                  },
                }),
              });
            }, 10);
            return;
          }
        },
      },
    });
  });
  await page.goto("/clubs/");
  await page.getByRole("button", { name: "Pair & sync", exact: true }).click();
  await page.getByRole("tab", { name: "Private internet · Tor" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { torCalls: unknown[] }).torCalls,
    ),
  ).toEqual([]);
  await page
    .getByRole("button", {
      name: "Create private invite for Local test club",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Share this private invite", { exact: true }),
  ).toHaveValue(/^candid-tor-v1:/);
  expect(
    await page.evaluate(() => Object.values(localStorage).join(" ")),
  ).not.toContain("candid-tor-v1:");
  await page
    .getByRole("button", { name: "Back to dashboard", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pair & sync · Tor waiting", exact: true })
    .click();
  await expect(
    page.getByLabel("Share this private invite", { exact: true }),
  ).toHaveValue(/^candid-tor-v1:/);
  await page
    .getByRole("button", { name: "Stop Tor sharing", exact: true })
    .click();
  const invite =
    "candid-tor-v1:" +
    Buffer.from(
      JSON.stringify({
        onion: "a".repeat(55) + "d.onion",
        key: Buffer.alloc(32, 7).toString("base64url"),
        clubId: "incoming-club",
        expires: Math.floor(Date.now() / 1000) + 600,
      }),
    ).toString("base64url");
  await page.getByLabel("Tor invite code", { exact: true }).fill(invite);
  await page
    .getByRole("button", { name: "Connect with invite", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Join Peer test club?", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("calender:clubs:v1")),
  ).not.toContain("incoming-club");
  await page
    .getByRole("button", { name: "Join club & sync", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("calender:clubs:v1")),
  ).toContain("incoming-club");
  const calls = await page.evaluate(
    () =>
      (
        window as unknown as {
          torCalls: Array<{ command: string; args: Record<string, unknown> }>;
        }
      ).torCalls,
  );
  expect(
    JSON.stringify(
      calls.filter((c) => ["tor_send", "tor_host"].includes(c.command)),
    ),
  ).not.toContain("PERSONAL DO NOT SHARE");
  expect(calls.some((c) => c.command === "tor_send")).toBe(true);
  await page
    .getByRole("button", { name: "Back to dashboard", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Calendar", exact: true })
    .first()
    .click();
  await expect
    .poll(
      async () =>
        (
          await page.evaluate(
            () =>
              (window as unknown as { torCalls: Array<{ command: string }> })
                .torCalls,
          )
        ).filter((c) => c.command === "tor_stop").length,
    )
    .toBeGreaterThanOrEqual(2);
});
