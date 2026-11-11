import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// This config runs in Node, but tsconfig.node.json leaves out Node's types.
declare const process: { env: Record<string, string | undefined> };

/**
 * Stamps each build with an ID: the page gets it as __BUILD_ID__, and the
 * build writes it to /version.json. Open tabs fetch that file now and then,
 * and when the ID there isn't theirs, a new release is out and they offer to
 * reload (see src/utils/update-check.ts).
 */
function buildVersion(): Plugin {
  const sha = process.env.GITHUB_SHA?.slice(0, 7) ?? "local";
  const buildId = `${sha}-${Date.now().toString(36)}`;
  return {
    name: "codako-build-version",
    config: () => ({ define: { __BUILD_ID__: JSON.stringify(buildId) } }),
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ buildId }),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    buildVersion(),
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
