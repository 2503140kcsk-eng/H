import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.GITHUB_PAGES === "true" ? "/H/" : "/";

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        id: base,
        scope: base,
        start_url: base,
        name: "Starlight Wing — 星の翼",
        short_name: "Starlight Wing",
        description: "かわいさ×本格SFの3D宇宙シューティング",
        theme_color: "#080d27",
        background_color: "#080d27",
        display: "fullscreen",
        orientation: "landscape",
        start_url: "/",
        icons: [
          { src: `${base}icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
        navigateFallback: `${base}index.html`
      }
    })
  ],
  build: {
    target: "es2022",
    sourcemap: false
  }
});
