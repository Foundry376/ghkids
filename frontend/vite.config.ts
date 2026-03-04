import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "codako",
      project: "frontend",
    }),
  ],
  build: {
    sourcemap: true,
  },
  server: {
    open: true,
  },
});
