import { describe, expect, it } from "vitest";

import { loadEnv } from "./server";

const validEnv = {
  NODE_ENV: "test",
  PORT: "3002",
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
};

describe("loadEnv", () => {
  it("parses a complete environment", () => {
    const env = loadEnv(validEnv);

    expect(env.NODE_ENV).toBe("test");
    expect(env.PORT).toBe(3002);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
  });

  it("applies defaults for optional variables", () => {
    const { NODE_ENV: _nodeEnv, PORT: _port, ...withoutDefaults } = validEnv;
    const env = loadEnv(withoutDefaults);

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3002);
    expect(env.LOKI_URL).toBe("http://localhost:3101");
    expect(env.OTEL_EXPORTER_OTLP_ENDPOINT).toBe("http://localhost:4318");
    expect(env.CORS_ORIGIN).toBe("http://localhost:3000");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.SESSION_TTL_DAYS).toBe(7);
    expect(env.EMAIL_FROM).toBe("no-reply@coders-university.local");
    expect(env.APP_URL).toBe("http://localhost:5173");
    expect(env.MAILTRAP_SMTP_PORT).toBe(2525);
  });

  it("names every missing variable and never prints secret values", () => {
    expect(() => loadEnv({})).toThrowError(/NODE_ENV|DATABASE_URL/);

    try {
      loadEnv({
        ...validEnv,
        DATABASE_URL: "",
      });
      expect.unreachable("loadEnv should have thrown");
    } catch (error) {
      const message = (error as Error).message;

      expect(message).toContain("DATABASE_URL");
      expect(message).not.toContain(validEnv.DATABASE_URL);
    }
  });

  it("rejects an invalid port", () => {
    expect(() => loadEnv({ ...validEnv, PORT: "70000" })).toThrowError(/PORT/);
  });

  it("rejects a non-PostgreSQL database URL", () => {
    expect(() =>
      loadEnv({ ...validEnv, DATABASE_URL: "mysql://localhost/db" }),
    ).toThrowError(/DATABASE_URL/);
  });
});
