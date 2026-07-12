import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// DryTrack — Mobile First / Offline First (siehe 000 Vision).
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
});
