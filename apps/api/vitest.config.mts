import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      PORT: "3002",
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      DATABASE_URL:
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      LOG_LEVEL: "info",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/domain/**/*.ts", "src/**/application/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
