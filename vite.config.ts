import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const pagesBase = process.env.GITHUB_PAGES === "true"
  ? `/${process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "H"}/`
  : "/";
const withBase = (path: string): string => `${pagesBase}${path.replace(/^\/+/, "")}`;

export default defineConfig({
  base: pagesBase,
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        id: pagesBase,
        name: "Starlight Wing — 星の翼",
        short_name: "Starlight Wing",
        description: "かわいさ×本格SFの3D宇宙シューティング",
        theme_color: "#080d27",
        background_color: "#080d27",
        display: "fullscreen",
        orientation: "landscape",
        scope: pagesBase,
        start_url: pagesBase,
        icons: [
          { src: withBase("icon.svg"), sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
        // The VRM loader is downloaded only after the user chooses a local model.
        globIgnores: ["**/vrmPreview-*.js"],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/vrmPreview-[\w-]+\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "pilot-vrm-runtime",
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 30 * 24 * 60 * 60
              },
              cacheableResponse: { statuses: [200] }
            }
          }
        ],
        navigateFallback: withBase("index.html")
      }
    })
  ],
  build: {
    target: "es2022",
    sourcemap: false
  }
});
