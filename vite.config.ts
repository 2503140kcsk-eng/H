import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        id: "/",
        name: "Starlight Wing — 星の翼",
        short_name: "Starlight Wing",
        description: "かわいさ×本格SFの3D宇宙シューティング",
        theme_color: "#080d27",
        background_color: "#080d27",
        display: "fullscreen",
        orientation: "landscape",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
        navigateFallback: "/index.html"
      }
    })
  ],
  build: {
    target: "es2022",
    sourcemap: false
  }
});
