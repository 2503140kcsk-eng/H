import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["iPhone 13 landscape"]
  },
  projects: [
    {
      name: "chromium-iphone-landscape",
      use: {
        browserName: "chromium",
        launchOptions: {
          args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--disable-gpu-sandbox"]
        }
      }
    }
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
