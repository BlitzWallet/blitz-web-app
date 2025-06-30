import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { VitePWA } from "vite-plugin-pwa";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === "production";
  return {
    plugins: [
      react(),
      wasm(),
      topLevelAwait(),
      nodePolyfills({
        // Whether to polyfill specific globals.
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        // Whether to polyfill Node.js built-in modules.
        protocolImports: true,
        // Include specific polyfills
        include: ["buffer", "stream", "crypto"],
      }),
      // Custom plugin to fix WASM MIME type in dev
      VitePWA({
        workbox: {
          maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // 20 MB
        },
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "robots.txt", "apple-touch-icon.png"],
        manifest: {
          name: "Blitz Wallet",
          short_name: "Blitz Wallet",
          description: "Self-custodial Bitcoin Lightning wallet using Spark",
          theme_color: "#ffffff",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
      }),
    ],
    define: {
      global: "globalThis",
    },
    // Remove console logs in production
    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
    },
    build: {
      rollupOptions: {
        plugins: [
          {
            name: "ignore-non-english-wordlists",
            resolveId(source) {
              if (/.*\/wordlists\/(?!english).*\.json$/.test(source)) {
                return source;
              }
              return null;
            },
            load(id) {
              if (/.*\/wordlists\/(?!english).*\.json$/.test(id)) {
                return "export default {}";
              }
              return null;
            },
          },
        ],
      },
    },
  };
});
