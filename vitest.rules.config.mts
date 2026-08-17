import { defineConfig } from "vitest/config";
import path from "node:path";

// Separate from vitest.config.mts on purpose: this suite needs a live
// Firestore emulator (`firebase emulators:start --only firestore`) and
// must never run as part of the default `npm test` — see
// docs/tasks/phase-16-testing.md TASK-1603.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["test/firestore.rules.test.ts"],
    hookTimeout: 30000,
    testTimeout: 15000,
  },
});
