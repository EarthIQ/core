import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { domToCodePlugin } from "dom-to-code/vite";
import { resolve } from "path";
import fs from "fs";

// Load dynamically generated module aliases
const moduleAliases: Record<string, string> = {};
const pathsFile = resolve(__dirname, "./modules.paths.json");

if (fs.existsSync(pathsFile)) {
  try {
    const paths: Record<string, string> = JSON.parse(
      fs.readFileSync(pathsFile, "utf-8"),
    );
    for (const [key, val] of Object.entries(paths)) {
      const absPath = resolve(__dirname, val);
      moduleAliases[key] = absPath;
      const dirPath = absPath.substring(0, absPath.lastIndexOf("/"));
      moduleAliases[`${key}/*`] = `${dirPath}/*`;
    }
  } catch (e) {
    console.error("Failed to parse modules.paths.json:", e);
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), domToCodePlugin()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      ...moduleAliases,
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL ?? "http://localhost:8000",
        changeOrigin: true,
        ws: true, // forward WebSocket upgrades (notifications /api/notifications/stream)
      },
    },
  },
});
