import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
    proxy: {
      "/api/ws": {
        target: "ws://localhost:5005",
        changeOrigin: true,
        ws: true,
      },
      "/api": {
        target: "http://localhost:5005",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:5005",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "build",
  },
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
});
