import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist" },
  // Only for local development/preview. Production must use a separately approved
  // same-origin reverse proxy for /api; never ship a cross-origin credentialed URL.
  server: { proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: false } } },
  preview: { proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: false } } },
});
