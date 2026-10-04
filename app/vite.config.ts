import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port backendu: domyślnie 8001 (zgodnie z docker-compose.override.yml w repo),
// nadpisywalny przez HUBMI_BACKEND_PORT, np. gdy stoisz na 8000.
const backend = `http://localhost:${process.env.HUBMI_BACKEND_PORT || 8001}`;

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist", sourcemap: false },
  server: {
    proxy: {
      "/api": {
        target: backend,
        changeOrigin: true,
      },
      "/health": {
        target: backend,
        changeOrigin: true,
      },
    },
  },
});
