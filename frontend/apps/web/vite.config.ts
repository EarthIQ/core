import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs";

// Load dynamically generated module aliases
const moduleAliases: Record<string, string> = {};
const pathsFile = resolve(__dirname, "./modules.paths.json");

if (fs.existsSync(pathsFile)) {
  try {
    const paths = JSON.parse(fs.readFileSync(pathsFile, "utf-8"));
    for (const [key, val] of Object.entries(paths)) {
      moduleAliases[key] = resolve(__dirname, val as string);
    }
  } catch (e) {
    console.error("Failed to parse modules.paths.json:", e);
  }
}

export default defineConfig({
  plugins: [react()],
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
      },
    },
  },
});


