import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("full app reset requires confirmation, preserves cancellation, clears every workspace and reloads other tabs", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try examples" }).click();
  await page.evaluate(() => {
    localStorage.setItem(
      "candid:notes:v1",
      JSON.stringify({
        version: 1,
        state: {
          notes: [
            {
              id: "private-note",
              path: "Private.md",
              body: "PRIVATE_RESET_MARKER",
              courseId: "",
              eventId: "",
              pinned: true,
              createdAt: "2026-10-28T10:00:00.000Z",
              updatedAt: "2026-10-28T10:00:00.000Z",
            },
          ],
        },
      }),
    );
    localStorage.setItem(
      "calender:clubs:v1",
      JSON.stringify({
        version: 1,
        state: {
          deviceId: "private-device",
          displayName: "Private name",
          clubs: [{ id: "private-club", name: "Private club", records: [] }],
        },
      }),
    );
    localStorage.setItem(
      "candid:scheduling:v1",
      JSON.stringify({
        version: 1,
        state: {
          host: "PRIVATE_HOST",
          types: [],
          offers: [],
          bookings: [],
          availability: Array.from({ length: 7 }, (_, day) => ({
            day,
            enabled: false,
            start: 540,
            end: 1020,
          })),
        },
      }),
    );
    const student = JSON.parse(localStorage.getItem("calender:student:v1")!);
    student.state.focus = {
      until: Date.now() + 3600000,
      remaining: 3600,
      duration: 60,
      sessions: 9,
      label: "PRIVATE_FOCUS",
    };
    localStorage.setItem("calender:student:v1", JSON.stringify(student));
    localStorage.setItem("theme", "dark");
    localStorage.setItem("test:unrelated", "keep");
    sessionStorage.setItem("candid:private-session", "PRIVATE_SESSION");
  });
  await page.goto("/settings/");
  const other = await context.newPage();
  await other.goto("/notes/");
  await expect(other.getByText("Private", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  await page.getByRole("button", { name: "Reset Candid", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  const erase = dialog.getByRole("button", {
    name: "Erase everything & restart",
    exact: true,
  });
  await expect(erase).toBeDisabled();
  await dialog.getByLabel("Type RESET to confirm").fill("RESET");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("candid:notes:v1")),
  ).toContain("PRIVATE_RESET_MARKER");
  await page.getByRole("button", { name: "Reset Candid", exact: true }).click();
  await expect(erase).toBeDisabled();
  await dialog.getByLabel("Type RESET to confirm").fill("RESET");
  await expect(dialog).toHaveCSS("opacity", "1");
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await erase.click();
  await expect(page).toHaveURL("http://127.0.0.1:4173/");
  await expect(
    page.getByRole("button", { name: "Try examples" }),
  ).toBeVisible();
  await expect(other).toHaveURL("http://127.0.0.1:4173/");
  await page.keyboard.press("Control+z");
  await expect(
    page.getByRole("button", { name: "Try examples" }),
  ).toBeVisible();
  const remaining = await page.evaluate(() => ({
    values: [
      "calender:events:v1",
      "calender:student:v1",
      "calender:clubs:v1",
      "candid:notes:v1",
      "candid:scheduling:v1",
    ].map((key) => localStorage.getItem(key)),
    theme: localStorage.getItem("theme"),
    unrelated: localStorage.getItem("test:unrelated"),
    draft: sessionStorage.getItem("candid:private-session"),
  }));
  expect(remaining.values.every((value) => value === null)).toBe(true);
  expect(remaining.theme).not.toBe("dark");
  expect(remaining.unrelated).toBe("keep");
  expect(remaining.draft).toBeNull();
});
