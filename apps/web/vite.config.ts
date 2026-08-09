import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      devOptions: {
        enabled: true,
        type: "module",
      },
      manifest: {
        name: "SQL学習アプリ",
        short_name: "SQL学習",
        description: "ブラウザ完結のSQL学習ターミナル",
        lang: "ja",
        display: "standalone",
        start_url: "/",
        scope: "/",
        theme_color: "#1d4ed8",
        background_color: "#f6f5f0",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,wasm,data,svg,png,ico}"],
        // Workboxのデフォルト上限は2MiB。pglite-*.wasm(約10MB)・pglite-*.data(約6.3MB)が
        // 黙ってprecacheから漏れ、オフライン時にSQL実行だけ動かなくなるのを防ぐため引き上げる。
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        navigateFallback: "/index.html",
      },
    }),
  ],
});
