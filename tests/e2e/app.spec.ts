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


test("iPhone diagnostics capture live gameplay metrics and export local JSON and CSV reports", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");

  // Capture metrics from a real gameplay session, then return to the hangar.
  await page.locator('[data-mode="story"]').click();
  await expect(page.locator("#game-hud")).toBeVisible();
  await page.waitForTimeout(1200);
  await page.locator("#pause-button").click();
  await expect(page.locator("#pause-modal")).toBeVisible();
  await page.locator("#pause-menu-button").click();
  await expect(page.locator("#menu-screen")).toBeVisible();
  await expect(page.locator("#game-hud")).toBeHidden();

  await page.locator("#settings-toggle").click();
  await page.locator("#diagnostics-open").click();
  await expect(page.locator("#diagnostics-modal")).toBeVisible();
  await page.locator("#diagnostics-refresh").click();
  await expect(page.locator("#diagnostics-status")).toContainText("診断を取得しました");
  await expect(page.locator("#diagnostics-json")).toBeEnabled();

  const jsonPromise = page.waitForEvent("download");
  await page.locator("#diagnostics-json").click();
  const jsonDownload = await jsonPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(/^starlight-wing-diagnostics-.*\.json$/);
  const jsonStream = await jsonDownload.createReadStream();
  let jsonText = "";
  for await (const chunk of jsonStream ?? []) jsonText += chunk.toString();
  const report = JSON.parse(jsonText) as {
    format: string;
    version: number;
    storage: { persistenceStatus: string };
    capabilities: { webgl2: boolean | null };
    game: {
      sampleCount: number;
      averageFrameTimeMs: number | null;
      p95FrameTimeMs: number | null;
      worstFrameTimeMs: number | null;
      estimatedFps: number | null;
      renderCalls: number;
      triangles: number;
      geometries: number;
      textures: number;
      drawingBuffer: { width: number; height: number };
      webgl: { maxTextureSize: number; maxRenderbufferSize: number } | null;
    } | null;
  };
  expect(report.format).toBe("starlight-wing-diagnostics");
  expect(report.version).toBe(1);
  expect(report.storage.persistenceStatus).toBe("persistent");
  expect(report.capabilities.webgl2).toBe(true);
  expect(report.game).not.toBeNull();
  expect(report.game!.sampleCount).toBeGreaterThan(0);
  expect(report.game!.averageFrameTimeMs).toBeGreaterThan(0);
  expect(report.game!.p95FrameTimeMs).toBeGreaterThan(0);
  expect(report.game!.worstFrameTimeMs).toBeGreaterThan(0);
  expect(report.game!.estimatedFps).toBeGreaterThan(0);
  expect(report.game!.renderCalls).toBeGreaterThan(0);
  expect(report.game!.triangles).toBeGreaterThan(0);
  expect(report.game!.drawingBuffer.width).toBeGreaterThan(0);
  expect(report.game!.drawingBuffer.height).toBeGreaterThan(0);
  expect(report.game!.webgl?.maxTextureSize).toBeGreaterThan(0);
  expect(report.game!.webgl?.maxRenderbufferSize).toBeGreaterThan(0);

  const csvPromise = page.waitForEvent("download");
  await page.locator("#diagnostics-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toMatch(/^starlight-wing-diagnostics-.*\.csv$/);
  const csvStream = await csvDownload.createReadStream();
  let csvText = "";
  for await (const chunk of csvStream ?? []) csvText += chunk.toString();
  expect(csvText).toContain('"path","value"');
  expect(csvText).toContain('"device.viewport.width"');
  expect(csvText).toContain('"game.estimatedFps"');

  await page.locator("#diagnostics-close").click();
  await expect(page.locator("#diagnostics-modal")).toBeHidden();
  expect(errors).toEqual([]);
});


test("weapon dock unlocks, persists, exports and equips the selected combat weapon", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("starlight-wing");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const data = {
      version: 1,
      shards: 2000,
      upgrades: { attack: 0, hull: 0 },
      bestScores: {},
      settings: { sensitivity: 1, volume: 0.65 },
      totalRuns: 0,
      unlockedShips: ["Lumen-01"],
      selectedShip: "Lumen-01",
      unlockedPilots: ["lumi-asteria"],
      selectedPilot: "lumi-asteria",
      pilotProgress: { "lumi-asteria": { level: 1, xp: 0 } },
      pilotLevel: 1,
      pilotXp: 0,
      unlockedWeapons: ["star-pulse"],
      selectedWeapon: "star-pulse"
    };
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("saves", "readwrite");
      transaction.objectStore("saves").put({ id: "pilot", data, updatedAt: Date.now() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();

  const options = page.locator("#weapon-list [data-weapon-id]");
  await expect(options).toHaveCount(3);
  await expect(page.locator('[data-weapon-id="star-pulse"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-weapon-id="prism-fan"]')).toBeEnabled();
  await expect(page.locator('[data-weapon-id="nova-lance"]')).toBeEnabled();

  await page.locator('[data-weapon-id="prism-fan"]').click();
  await expect(page.locator('[data-weapon-id="prism-fan"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-weapon-id="nova-lance"]').click();
  await expect(page.locator('[data-weapon-id="nova-lance"]')).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.locator('[data-weapon-id="nova-lance"]')).toHaveAttribute("aria-pressed", "true");
  const backupPromise = page.waitForEvent("download");
  await page.locator("#export-save").click();
  const backup = await backupPromise;
  const stream = await backup.createReadStream();
  let serialized = "";
  for await (const chunk of stream ?? []) serialized += chunk.toString();
  const envelope = JSON.parse(serialized) as { payload: { unlockedWeapons: string[]; selectedWeapon: string } };
  expect(envelope.payload.unlockedWeapons).toEqual(["star-pulse", "prism-fan", "nova-lance"]);
  expect(envelope.payload.selectedWeapon).toBe("nova-lance");

  await page.locator('[data-mode="story"]').click();
  await expect(page.locator("#weapon-label")).toHaveText("NOVA LANCE");
  expect(errors).toEqual([]);
});


test("rejects non-VRM avatar files locally without starting a model loader", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#pilot-vrm-import")).toBeVisible();
  await expect(page.locator("#pilot-vrm-status")).toContainText("32 MiB");

  await page.locator("#pilot-vrm-file").setInputFiles({
    name: "not-a-vrm.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a VRM model")
  });
  await expect(page.locator("#pilot-vrm-status")).toContainText(".vrm");
  await expect(page.locator("#pilot-model-preview")).toBeHidden();
  expect(errors).toEqual([]);
});
