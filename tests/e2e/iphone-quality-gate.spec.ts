import { expect, test } from "@playwright/test";

test("Q-TRACE opens, refreshes, and exports an auditable JSON passport", async ({ page }) => {
  await page.goto("/");
  await page.locator("#iphone-quality-open").click();
  await expect(page.getByRole("heading", { name: /Q-TRACE/ })).toBeVisible();
  await expect(page.locator("#quality-checks [data-quality-id]")).toHaveCount(12);
  await page.locator("#quality-audio-resume").click();
  await expect(page.locator("#quality-audio-resume")).toContainText("音声状態:");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#quality-export-json").click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error("Q-TRACE JSON export did not provide a readable stream.");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const packet = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
    schema: string;
    version: number;
    checks: Array<{ id: string }>;
    manualChecks: Array<{ id: string; verified: boolean }>;
  };
  expect(packet.schema).toBe("starlight-wing-q-trace");
  expect(packet.version).toBe(1);
  expect(packet.checks.map((check) => check.id)).toContain("webgl2");
  expect(packet.manualChecks.length).toBe(5);
});

test("Q-TRACE exports CSV with environment and check evidence", async ({ page }) => {
  await page.goto("/");
  await page.locator("#iphone-quality-open").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#quality-export-csv").click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error("Q-TRACE CSV export did not provide a readable stream.");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain("id,category,status,title,detail,action");
  expect(csv).toContain("webgl2");
  expect(csv).toContain("env:userAgent");
});

test("Q-TRACE observes game-canvas touch input and app lifecycle evidence", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-mode="story"]').click();
  const canvas = page.locator("#game-canvas");
  await canvas.dispatchEvent("webglcontextlost", { cancelable: true });
  await expect(page.locator("#pause-modal")).toBeVisible();
  await canvas.dispatchEvent("webglcontextrestored");
  await page.locator("#resume-button").click();
  await page.touchscreen.tap(420, 220);
  await page.locator("#pause-button").click();
  await page.locator("#pause-menu-button").click();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("pageshow"));
  });
  await page.locator("#iphone-quality-open").click();
  const pointerCheck = page.locator('[data-quality-id="game-canvas-pointer"]');
  await expect(pointerCheck).toContainText(/down [1-9]/);
  await expect(pointerCheck).toContainText(/up-or-cancel [1-9]/);
  await expect(page.locator('[data-quality-id="webgl-recovery"]')).toContainText("PASS");
  await expect(page.locator('[data-quality-id="lifecycle-resume"]')).toContainText("PASS");
});
