import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { PUBLIC_API_ENV_NAMES, validatePublicEnv } from "./src/utils/backendUrl.js";
export default defineConfig(({ command, mode }) => {
  validatePublicEnv({ ...loadEnv(mode, process.cwd(), ""), ...process.env, PROD: command === "build" });
  return {
    envPrefix: PUBLIC_API_ENV_NAMES,
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy: { "/api": "http://localhost:3000", "/api-docs": "http://localhost:3000" } }
  };
});
