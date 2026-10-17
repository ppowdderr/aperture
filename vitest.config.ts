import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    // The real-data solver test measures wall-clock latency; parallel test files
    // otherwise compete for the same CPU and make that assertion flaky.
    fileParallelism: false,
  },
});
