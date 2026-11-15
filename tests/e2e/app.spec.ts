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

test("shows the 3D pilot preview and persists a meaningful narrative branch", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#pilot-preview-canvas")).toBeVisible();
  await expect(page.locator("#pilot-skill-list [data-skill-id]")).toHaveCount(3);
  await expect(page.locator("#pilot-skin-list [data-pilot-skin-id]")).toHaveCount(2);
  await expect(page.locator('[data-pilot-skin-id="nebula-veil"]')).toBeDisabled();
  await expect(page.locator("#pilot-story-choices [data-story-choice]")).toHaveCount(2);
  await page.locator('#pilot-story-choices [data-story-choice="follow-signal"]').click();
  await expect(page.locator("#pilot-story-response")).toContainText("星図の断片");
  await expect(page.locator('#pilot-story-choices [data-story-choice="follow-signal"]')).toBeDisabled();
  await page.reload();
  await expect(page.locator("#pilot-story-response")).toContainText("星図の断片");
  await expect(page.locator('#pilot-story-choices [data-story-choice="follow-signal"]')).toHaveClass(/selected/);
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


test("hangar shows four distinct ships and locks unaffordable ships", async ({ page }) => {
  await page.goto("/");
  const options = page.locator("#ship-list [data-ship-id]");
  await expect(options).toHaveCount(4);
  await expect(page.locator('[data-ship-id="Lumen-01"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-ship-id="Aqua-Comet"]')).toBeDisabled();
  await expect(page.locator('[data-ship-id="Rose-Bastion"]')).toBeDisabled();
  await expect(page.locator('[data-ship-id="Astra-Arc"]')).toBeDisabled();
  await expect(page.locator("#pilot-list [data-pilot-id]")).toHaveCount(3);
  await expect(page.locator('[data-pilot-id="lumi-asteria"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-pilot-id="noa-celeste"]')).toBeDisabled();
  await expect(page.locator('[data-pilot-id="rin-vega"]')).toBeDisabled();
  await expect(page.locator("#save-status")).toContainText("端末内保存");
});


test("weapon lab and campaign show two slots and sequential planet availability", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#weapon-list [data-weapon-id]")).toHaveCount(5);
  await expect(page.locator('[data-weapon-id="eclipse-lance"]')).toBeDisabled();
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
  seed.unlockedShips.push("Aqua-Comet", "Astra-Arc");
  seed.selectedShip = "Aqua-Comet";
  seed.unlockedWeapons.push("prism-laser", "comet-homing", "eclipse-lance");
  seed.equippedWeapons = ["prism-laser", "comet-homing"];
  seed.activeWeaponSlot = 1;
  seed.unlockedPilotSkins.push("nebula-veil");
  seed.selectedPilotSkin = "nebula-veil";
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
    expect(download.suggestedFilename()).toBe("starlight-wing-save-v2.json");
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
      await expect(destinationPage.locator('[data-ship-id="Astra-Arc"]')).toBeVisible();
      await expect(destinationPage.locator('[data-pilot-skin-id="nebula-veil"]')).toHaveAttribute("aria-pressed", "true");
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
  test.setTimeout(45_000);
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
  await page.locator('#pilot-story-choices [data-story-choice="follow-signal"]').click();
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

  // The selected first-act choice changes the second timed event and reward.
  await page.clock.runFor(10_000);
  await expect(page.locator("#comms-message")).toContainText("星図逆照準");
  await page.clock.runFor(7_000);
  await expect(page.locator("#comms-message")).toContainText("第二段階達成！ +900 SCORE / +18 ✦");
  expect(errors).toEqual([]);
});


test("upgrades both v1 IndexedDB save stores to v2 without losing progression", async ({ page }) => {
  // Hold the application module so the test can create the exact legacy v1
  // database before Dexie opens it during boot.
  await page.route("**/src/main.ts", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "export {};" })
  );
  await page.goto("/");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("starlight-wing", 1);
      request.onupgradeneeded = () => {
        const saves = request.result.createObjectStore("saves", { keyPath: "id" });
        saves.createIndex("updatedAt", "updatedAt");
        const recovery = request.result.createObjectStore("recovery", { keyPath: "id" });
        recovery.createIndex("createdAt", "createdAt");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const oldSave = {
      version: 1,
      shards: 1450,
      upgrades: { attack: 2, hull: 1 },
      bestScores: { story: 700 },
      settings: { sensitivity: 1.1, volume: 0.6 },
      totalRuns: 2,
      unlockedShips: ["Lumen-01", "Aqua-Comet"],
      selectedShip: "Aqua-Comet",
      completedPlanets: ["aurora-prime"],
      storyChoices: { "lumi-asteria:aurora-prime": "follow-signal" },
      storyFlags: ["celestial-echo"]
    };
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(["saves", "recovery"], "readwrite");
      transaction.objectStore("saves").put({
        id: "pilot", data: oldSave, updatedAt: 10
      });
      transaction.objectStore("recovery").put({
        id: "latest", data: { ...oldSave, shards: 900 }, createdAt: 9
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Seed transaction aborted"));
    });
    db.close();
  });

  await page.unroute("**/src/main.ts");
  await page.reload();
  await expect(page.locator("#save-status")).toContainText("端末内保存");

  const migrated = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("starlight-wing");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise<{
      version: number;
      active: { data: { version: number; shards: number; selectedShip: string; campaign?: unknown } } | undefined;
      recovery: { data: { version: number; shards: number; campaign?: unknown } } | undefined;
    }>((resolve, reject) => {
      const transaction = db.transaction(["saves", "recovery"], "readonly");
      const activeRequest = transaction.objectStore("saves").get("pilot");
      const recoveryRequest = transaction.objectStore("recovery").get("latest");
      transaction.oncomplete = () => resolve({
        version: db.version,
        active: activeRequest.result,
        recovery: recoveryRequest.result
      });
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    return result;
  });

  // Dexie encodes schema version 2 as native IndexedDB version 20.
  expect(migrated.version).toBe(20);
  expect(migrated.active?.data).toMatchObject({
    version: 2, shards: 1450, selectedShip: "Aqua-Comet"
  });
  expect(migrated.active?.data.campaign).toBeTruthy();
  expect(migrated.recovery?.data).toMatchObject({ version: 2, shards: 900 });
  expect(migrated.recovery?.data.campaign).toBeTruthy();
});

test("a failed valid-backup restore leaves the active save and recovery store unchanged", async ({ page }) => {
  const { createBackup, createDefaultSave } = await import("../../src/game/core");
  const incoming = createDefaultSave();
  incoming.unlockedShips.push("Aqua-Comet");
  incoming.selectedShip = "Aqua-Comet";

  await page.addInitScript(() => {
    const runtime = window as Window & { __failSaveWrites?: boolean };
    runtime.__failSaveWrites = false;
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      if (runtime.__failSaveWrites && this.name === "saves") {
        throw new DOMException("Forced write failure", "QuotaExceededError");
      }
      return originalPut.call(this, value, key);
    };
  });
  await page.goto("/");
  await page.locator('#pilot-story-choices [data-story-choice="follow-signal"]').click();
  await expect(page.locator('#pilot-story-choices [data-story-choice="follow-signal"]')).toHaveClass(/selected/);
  await page.evaluate(() => {
    (window as Window & { __failSaveWrites?: boolean }).__failSaveWrites = true;
  });

  page.on("dialog", (dialog) => dialog.accept());
  await page.locator("#save-file").setInputFiles({
    name: "incoming-v2.json",
    mimeType: "application/json",
    buffer: Buffer.from(createBackup(incoming))
  });
  await expect(page.locator("#toast")).toContainText("復元を保存できませんでした");
  await expect(page.locator('#pilot-story-choices [data-story-choice="follow-signal"]')).toHaveClass(/selected/);

  await page.evaluate(() => {
    (window as Window & { __failSaveWrites?: boolean }).__failSaveWrites = false;
  });
  await page.reload();
  await expect(page.locator('#pilot-story-choices [data-story-choice="follow-signal"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-ship-id="Lumen-01"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-ship-id="Aqua-Comet"]')).toBeDisabled();

  const recoveryExists = await page.evaluate(async () => new Promise<boolean>((resolve, reject) => {
    const request = indexedDB.open("starlight-wing");
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("recovery", "readonly");
      const get = transaction.objectStore("recovery").get("latest");
      get.onsuccess = () => resolve(Boolean(get.result));
      get.onerror = () => reject(get.error);
      transaction.oncomplete = () => db.close();
    };
    request.onerror = () => reject(request.error);
  }));
  expect(recoveryExists).toBe(false);
});
