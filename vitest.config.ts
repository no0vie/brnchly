import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}", "packages/*/src/**/*.test.{ts,tsx}"],
  },
});
