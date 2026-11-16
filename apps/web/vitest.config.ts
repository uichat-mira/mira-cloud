import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    // Milkdown and dynamic Markdown imports are memory-heavy in isolated jsdom
    // workers. Keep the same assertions/timeouts without 19 parallel workers
    // exhausting an 8 GiB development machine.
    maxWorkers: 4,
  },
});
