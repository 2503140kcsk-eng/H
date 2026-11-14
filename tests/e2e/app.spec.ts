import { expect, test } from "@playwright/test";

test("title screen fits a landscape iPhone viewport", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /STARLIGHT/ })).toBeVisible();
  await expect(page.locator('[data-mode="story"]')).toBeVisible();
  await expect(page.getByText("NO ADS · NO GACHA · NO PAY-TO-WIN")).toBeVisible();
  expect(errors).toEqual([]);
});

test("starts a 3D run and supports pause and resume", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator('[data-mode="story"]').click();
  await expect(page.locator("#game-hud")).toBeVisible();
  await expect(page.locator("#pilot-label")).toHaveText("LUMI");
  await expect(page.locator("#ship-label")).toHaveText("Lumen-01");
  await page.locator("#pause-button").click();
  await expect(page.locator("#pause-modal")).toBeVisible();
  await page.locator("#resume-button").click();
  await expect(page.locator("#pause-modal")).toBeHidden();
  await expect(page.locator("#game-hud")).toBeVisible();
  expect(errors).toEqual([]);
});

test("settings panel toggles and retains valid input values", async ({ page }) => {
  await page.goto("/");
  await page.locator("#settings-toggle").click();
  await expect(page.locator("#settings-panel")).toBeVisible();
  await page.locator("#sensitivity").fill("1.35");
  await expect(page.locator("#sensitivity")).toHaveValue("1.35");
  await page.locator("#settings-toggle").click();
  await expect(page.locator("#settings-panel")).toBeHidden();
});


test("returns to the hangar and can launch another run without page errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator('[data-mode="story"]').click();
  await expect(page.locator("#game-hud")).toBeVisible();
  await page.locator("#pause-button").click();
  await expect(page.locator("#pause-modal")).toBeVisible();
  await page.locator("#pause-menu-button").click();
  await expect(page.locator("#menu-screen")).toBeVisible();
  await expect(page.locator("#game-hud")).toBeHidden();
  await page.locator('[data-mode="endless"]').click();
  await expect(page.locator("#game-hud")).toBeVisible();
  expect(errors).toEqual([]);
});

test("warns when IndexedDB is unavailable instead of implying durable saves", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined });
  });
  await page.goto("/");
  await expect(page.locator("#save-status")).toContainText("メモリ保存のみ");
});


test("pauses safely on WebGL context loss and requires explicit resume after restoration", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator('[data-mode="story"]').click();

  const canvas = page.locator("#game-canvas");
  await canvas.dispatchEvent("webglcontextlost", { cancelable: true });
  await expect(page.locator("#pause-modal")).toBeVisible();
  await expect(page.locator("#toast")).toContainText("3D描画が一時停止しました");

  await canvas.dispatchEvent("webglcontextrestored");
  await expect(page.locator("#toast")).toContainText("3D描画が復旧しました");
  await page.locator("#resume-button").click();
  await expect(page.locator("#pause-modal")).toBeHidden();
  expect(errors).toEqual([]);
});


test("hangar shows three distinct ships and locks unaffordable ships", async ({ page }) => {
  await page.goto("/");
  const options = page.locator("#ship-list [data-ship-id]");
  await expect(options).toHaveCount(3);
  await expect(page.locator('[data-ship-id="Lumen-01"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-ship-id="Aqua-Comet"]')).toBeDisabled();
  await expect(page.locator('[data-ship-id="Rose-Bastion"]')).toBeDisabled();
  await expect(page.locator("#pilot-list [data-pilot-id]")).toHaveCount(3);
  await expect(page.locator('[data-pilot-id="lumi-asteria"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-pilot-id="noa-celeste"]')).toBeDisabled();
  await expect(page.locator('[data-pilot-id="rin-vega"]')).toBeDisabled();
  await expect(page.locator("#save-status")).toContainText("端末内保存");
});
