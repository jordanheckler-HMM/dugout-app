import { expect, Page, test } from "@playwright/test";
import path from "node:path";

const shots = process.env.SCREENSHOT_DIR;

async function shot(page: Page, name: string) {
  if (!shots) return;
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false });
}

async function drag(page: Page, source: string, target: string) {
  const from = page.locator(source).first();
  const to = page.locator(target).first();
  await from.scrollIntoViewIfNeeded();
  await to.scrollIntoViewIfNeeded();
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (!start || !end) throw new Error(`Missing drag boxes for ${source} -> ${target}`);
  await page.mouse.move(start.x + start.width / 2, start.y + Math.min(24, start.height / 2));
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2 + 12, start.y + 16, { steps: 4 });
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 18 });
  await page.mouse.up();
}

async function addPlayer(page: Page, name: string, number: string, position: string, bats: "Left" | "Right" | "Switch") {
  await page.getByRole("button", { name: "Add player", exact: true }).first().click();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Jersey Number (Optional)").fill(number);
  await page.locator("#primary-position").click();
  await page.getByRole("option", { name: position, exact: true }).click();
  if (bats !== "Right") await page.getByRole("button", { name: `Bats ${bats}` }).click();
  await page.getByRole("button", { name: "Add Player" }).click();
  await expect(page.getByText(name).first()).toBeVisible();
}

async function setDh(page: Page, on: boolean) {
  const label = page.locator("label[for='dh-mode']");
  const toggle = page.getByRole("switch");
  await expect(label).toBeVisible();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const text = ((await label.textContent()) ?? "").replace(/\s+/g, " ").trim();
    if (text === (on ? "DH on" : "DH off")) return;
    await page.mouse.up();
    await toggle.click();
    try {
      await expect(label).toHaveText(on ? "DH on" : "DH off", { timeout: 2500 });
      return;
    } catch {
      // The switch can swallow a click that lands during a drag. Try again.
    }
  }
  await expect(label).toHaveText(on ? "DH on" : "DH off");
}

const order = (page: Page) => page.locator("section").filter({ has: page.getByRole("heading", { name: "Batting order" }) });

test("clubhouse flows stay in sync without an AI coach", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
  await expect(page.getByText(/AI Coach|Lyra|Ollama/i)).toHaveCount(0);
  await shot(page, "after-squad");

  await addPlayer(page, "Maya Chen", "7", "SS", "Left");
  await addPlayer(page, "Luis Ortega", "8", "CF", "Right");
  await addPlayer(page, "Noah Patel", "21", "P", "Right");
  await page.locator("article").filter({ hasText: "Maya Chen" }).getByRole("button", { name: "Edit Maya Chen" }).click();
  await page.getByLabel("Notes").fill("Hits left, plays short.");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Hits left, plays short.")).toBeVisible();
  await shot(page, "after-squad");

  await page.getByRole("button", { name: "Add player", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Add Player" })).toBeVisible();
  await shot(page, "after-add-player");
  await page.keyboard.press("Escape");

  const nav = page.getByRole("navigation", { name: "Sections" });
  await nav.getByRole("link", { name: "Depth", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Depth chart" })).toBeVisible();
  await expect(page.getByText("Maya Chen").first()).toBeVisible();
  await shot(page, "after-depth");

  await nav.getByRole("link", { name: "Lineup", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Batting order" })).toBeVisible();
  await setDh(page, true);
  const before = await page.getByTestId("chemistry-score").textContent();

  await drag(page, '[data-player-id]:has-text("Maya Chen")', '[data-drop-id="lineup:1"]');
  await expect(order(page).getByText("Maya Chen")).toBeVisible();
  await expect(order(page).locator(".fit-badge", { hasText: "SS" })).toBeVisible();
  await expect(page.locator(".field-name", { hasText: "Chen" })).toBeVisible();
  await expect(page.getByTestId("chemistry-score")).not.toHaveText(before ?? "");

  await drag(page, '[data-player-id]:has-text("Luis Ortega")', '[data-drop-id="field:CF"]');
  await expect(order(page).getByText("Luis Ortega")).toBeVisible();
  await expect(page.locator(".field-name", { hasText: "Ortega" })).toBeVisible();

  await drag(page, '[data-player-id]:has-text("Noah Patel")', '[data-drop-id="field:P"]');
  await expect(page.getByText("Noah Patel is pitching and does not bat.")).toBeVisible();
  await expect(order(page).locator("[data-drop-id^='lineup:']").getByText("Noah Patel")).toHaveCount(0);
  await shot(page, "after-lineup-dh");

  await drag(page, '[data-drop-id="lineup:1"]', '[data-drop-id="lineup:2"]');
  await expect(order(page).locator('[data-drop-id="lineup:2"]').getByText(/Maya Chen|Luis Ortega/)).toBeVisible();
  await expect(page.locator(".field-name", { hasText: "Chen" })).toBeVisible();
  await expect(page.locator(".field-name", { hasText: "Ortega" })).toBeVisible();

  await setDh(page, false);
  await expect(page.getByText("Nine batters, including the pitcher.")).toBeVisible();
  await expect(order(page).locator("[data-drop-id^='lineup:']").getByText("Noah Patel")).toBeVisible();
  await expect(page.locator(".field-name", { hasText: "Patel" })).toBeVisible();
  await shot(page, "after-lineup-no-dh");

  await nav.getByRole("link", { name: "Diamond", exact: true }).click();
  await expect(page.getByText("No DH. The pitcher is in the batting order.")).toBeVisible();
  await shot(page, "after-diamond-no-dh");
  await setDh(page, true);
  await expect(page.getByText("Nine batters plus a DH. The pitcher does not hit.")).toBeVisible();
  await expect(page.getByText("Noah Patel is pitching and does not bat.")).toBeVisible();
  await shot(page, "after-diamond-dh");

  await page.getByRole("button", { name: "Save configuration" }).click();
  await page.getByPlaceholder("Friday starter").fill("Friday starter");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Load configuration" }).click();
  await page.getByRole("button", { name: "Friday starter · DH" }).click();
  // The batting order can be scrolled; verify the restored player is in the order.
  await expect(order(page).getByText("Maya Chen")).toHaveCount(1);
  await expect(page.locator(".field-name", { hasText: "Chen" })).toBeVisible();

  await nav.getByRole("link", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Games", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add Game" }).first().click();
  await page.getByLabel("Date *").fill("2026-10-04");
  await page.getByLabel("Opponent *").fill("Westfield");
  await page.getByRole("dialog").getByRole("button", { name: "Add Game" }).click();
  const gameDay = page.getByRole("grid", { name: "October 2026" }).getByRole("gridcell", { name: "4", exact: true });
  await gameDay.scrollIntoViewIfNeeded();
  await gameDay.click();
  await expect(page.getByText("Westfield").first()).toBeVisible();
  await shot(page, "after-schedule");
  await page.getByRole("button", { name: /Open stats for Westfield/ }).click();
  await expect(page.getByRole("heading", { name: /Westfield/ })).toBeVisible();
  await shot(page, "after-stats");

  await page.goto("/missing-page");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByText(/AI Coach|Lyra|Ollama/i)).toHaveCount(0);
  await shot(page, "after-not-found");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Squad" })).toBeVisible();
  await shot(page, "after-squad-mobile");
});
