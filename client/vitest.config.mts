import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  define: {
    __APP_VERSION__: JSON.stringify("test"),
    "process.env.APP_VERSION": JSON.stringify("0.1.0-build.42+abc1234"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
      // Fix ESM resolution: next-intl imports "next/navigation" without .js extension
      "next/navigation": path.resolve(__dirname, "node_modules/next/navigation.js"),
      "next/headers": path.resolve(__dirname, "node_modules/next/headers.js"),
      // Stub better-auth (WIP migration — package not yet installed)
      "better-auth/react": path.resolve(__dirname, "src/test/stubs/better-auth-react.ts"),
      "better-auth/client/plugins": path.resolve(
        __dirname,
        "src/test/stubs/better-auth-client-plugins.ts",
      ),
    },
  },
  test: {
    globals: true,
    // happy-dom boots 3-4x faster than jsdom; per-file jsdom init was the
    // dominant cost in the suite (~6s × 62 files). API coverage is a
    // superset of what React Testing Library exercises here.
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    // Share the DOM environment across test files within the same worker.
    // Combined with `setup.ts`'s global beforeEach (clears storage) and
    // afterEach (restores real timers + RTL cleanup), this removes the
    // per-file boot overhead without letting state leak between files.
    // `vi.mock()` is still hoisted per file so module mocks stay isolated.
    isolate: false,
    // 15s per test (up from the 5s vitest default). The AI engine tests
    // under src/lib/engine are CPU-heavy (individual tests run for 6-16
    // seconds of pure search) and share vitest's worker pool with the
    // lightweight component tests. When several engine workers land on
    // the same pool as a render-heavy test like MultiplayerGamePage,
    // the component test gets starved and waitFor loops blow through
    // 5s even though the actual render work is sub-second. 15s is
    // enough headroom that genuine slow tests still pass cleanly while
    // real regressions still fail fast — anything that legitimately
    // needs >15s is almost certainly stuck, not slow.
    testTimeout: 15_000,
    server: {
      deps: {
        // Process next-intl through vite's pipeline to avoid ESM bare-specifier issues
        inline: ["next-intl"],
      },
    },
  },
});
