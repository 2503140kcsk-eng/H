import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");
const base = "/H/";
const htmlPath = resolve(dist, "index.html");
const manifestPath = resolve(dist, "manifest.webmanifest");
const workerPath = resolve(dist, "sw.js");

for (const path of [htmlPath, manifestPath, workerPath, resolve(dist, "icon.svg")]) {
  assert.ok(existsSync(path), `Missing Pages build output: ${path}`);
}

const html = readFileSync(htmlPath, "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const worker = readFileSync(workerPath, "utf8");

assert.ok(html.includes(base + "assets/"), "HTML asset URLs must include the /H/ repository base.");
assert.ok(html.includes(base + "icon.svg"), "The app icon URL must include the /H/ repository base.");
assert.ok(!html.includes("/src/main.ts"), "The production HTML must not point at the Vite source entry.");
assert.equal(manifest.id, base, "Manifest id must be scoped to /H/.");
assert.equal(manifest.start_url, base, "Manifest start_url must be scoped to /H/.");
assert.equal(manifest.scope, base, "Manifest scope must be scoped to /H/.");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "Manifest must include an app icon.");
for (const icon of manifest.icons) {
  const pathname = new URL(icon.src, "https://pages.example.invalid" + base).pathname;
  assert.ok(pathname.startsWith(base), `Manifest icon escaped repository scope: ${icon.src}`);
  assert.ok(existsSync(resolve(dist, pathname.slice(base.length))), `Missing manifest icon: ${icon.src}`);
}
assert.ok(worker.includes(base + "index.html"), "Service worker navigation fallback must target /H/index.html.");
console.log("GitHub Pages artifact verified for /H/: HTML assets, manifest scope/start URL, icons and service-worker fallback.");
