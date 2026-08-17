import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "server-only": path.resolve(import.meta.dirname, "./test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    // firestore.rules.test.ts needs a live Firestore emulator (TASK-1603)
    // and is not reachable in CI/sandbox yet — run it explicitly via
    // `npm run test:rules`, kept out of the default `npm test` suite.
    exclude: ["**/node_modules/**", "test/firestore.rules.test.ts"],
  },
});
