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


test("weapon lab and campaign show two slots and sequential planet availability", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#weapon-list [data-weapon-id]")).toHaveCount(4);
  await expect(page.locator("#weapon-slot-list [data-weapon-slot]")).toHaveCount(2);
  await expect(page.locator("#planet-list [data-planet-id]")).toHaveCount(3);
  await expect(page.locator('[data-planet-id="aurora-prime"]')).toBeEnabled();
  await expect(page.locator('[data-planet-id="pyra-reach"]')).toBeDisabled();
  await expect(page.locator("#mission-briefing")).toContainText("ネビュラ・エンプレス");
});

test("switches the equipped weapon slot during a live sortie", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator('[data-mode="stage"]').click();
  await expect(page.locator("#game-hud")).toBeVisible();
  await expect(page.locator("#weapon-slot-label")).toHaveText("SLOT 1");
  await page.locator("#weapon-switch-button").click();
  await expect(page.locator("#weapon-slot-label")).toHaveText("SLOT 2");
  expect(errors).toEqual([]);
});

test("exports a backup and restores it in a fresh browser context for device migration", async ({ browser }) => {
  const { createBackup, createDefaultSave } = await import("../../src/game/core");
  const seed = createDefaultSave();
  seed.unlockedShips.push("Aqua-Comet");
  seed.selectedShip = "Aqua-Comet";
  seed.unlockedWeapons.push("prism-laser", "comet-homing");
  seed.equippedWeapons = ["prism-laser", "comet-homing"];
  seed.activeWeaponSlot = 1;
  seed.completedPlanets.push("aurora-prime");
  seed.selectedPlanet = "pyra-reach";

  const sourceContext = await browser.newContext({ viewport: { width: 844, height: 390 } });
  try {
    const sourcePage = await sourceContext.newPage();
    await sourcePage.goto("/");
    sourcePage.on("dialog", (dialog) => dialog.accept());
    await sourcePage.locator("#save-file").setInputFiles({
      name: "seed-save.json",
      mimeType: "application/json",
      buffer: Buffer.from(createBackup(seed))
    });
    await expect(sourcePage.locator("#toast")).toContainText("バックアップを復元しました");
    await expect(sourcePage.locator('[data-ship-id="Aqua-Comet"]')).toHaveAttribute("aria-pressed", "true");

    const downloadPromise = sourcePage.waitForEvent("download");
    await sourcePage.locator("#export-save").click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    if (!stream) throw new Error("The exported save did not produce a readable download stream.");
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const exported = Buffer.concat(chunks);

    const destinationContext = await browser.newContext({ viewport: { width: 844, height: 390 } });
    try {
      const destinationPage = await destinationContext.newPage();
      await destinationPage.goto("/");
      destinationPage.on("dialog", (dialog) => dialog.accept());
      await destinationPage.locator("#save-file").setInputFiles({
        name: "iphone-transfer.json",
        mimeType: "application/json",
        buffer: exported
      });
      await expect(destinationPage.locator("#toast")).toContainText("バックアップを復元しました");
      await expect(destinationPage.locator('[data-ship-id="Aqua-Comet"]')).toHaveAttribute("aria-pressed", "true");
      await expect(destinationPage.locator('[data-planet-id="pyra-reach"]')).toHaveAttribute("aria-pressed", "true");
      await expect(destinationPage.locator("#weapon-slot-1")).toHaveText("SLOT 2 · HOMING");
      await expect(destinationPage.locator("#weapon-slot-1")).toHaveAttribute("aria-pressed", "true");
    } finally {
      await destinationContext.close();
    }
  } finally {
    await sourceContext.close();
  }
});


test("shows pilot radio dialogue and completes the selected planet event", async ({ page }) => {
  test.setTimeout(35_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // The debug invulnerability switch is enabled only by Vite development mode
  // and this explicit query. Game time itself still advances through RAF.
  await page.addInitScript(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  });
  await page.clock.install();
  await page.goto("/?test=mission-events");
  await page.bringToFront();
  await page.locator('[data-mode="stage"]').click();
  await expect(page.locator("#pause-modal")).toBeHidden();
  await expect(page.locator("#comms-panel")).toBeVisible();
  await expect(page.locator("#comms-speaker")).toContainText("ルミ");
  await expect(page.locator("#comms-message")).toContainText("星の地図");

  // Run the real game loop to the 16s event trigger; the test-only guard
  // prevents combat RNG from ending the run before event rewards are observed.
  await page.clock.runFor(16_000);
  await expect(page.locator("#pause-modal")).toBeHidden();
  await expect(page.locator("#result-modal")).toBeHidden();
  await expect(page.locator("#comms-message")).toContainText("星灯り共鳴");

  await page.clock.runFor(8_000);
  await expect(page.locator("#result-modal")).toBeHidden();
  await expect(page.locator("#comms-message")).toContainText("達成！ +650 SCORE / +12 ✦");
  expect(errors).toEqual([]);
});
