import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// DryTrack — Mobile First / Offline First (siehe 000 Vision).
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: "app.[ext]",
      },
    },
  },
});
