import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3001,
    strictPort: true,
    hmr: {
      host: "127.0.0.1",
      port: 3001,
      protocol: "ws",
      clientPort: 3001,
    },
    watch: {
      usePolling: true,
    },
  },
});
