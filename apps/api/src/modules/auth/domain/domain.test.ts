import { describe, expect, it } from "vitest";

import { isSessionActive } from "./auth-session";
import { isTokenUsable } from "./auth-token";
import { toPublicUser } from "./auth-user";
import { systemClock } from "./clock";
import { isValidEmail, normalizeEmail } from "./email";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    userId: "user-1",
    tokenHash: "hash",
    userAgent: null,
    ipAddress: null,
    expiresAt: new Date(NOW.getTime() + 1_000),
    revokedAt: null,
    lastUsedAt: null,
    createdAt: NOW,
    ...overrides,
  };
}

describe("email", () => {
  it("normalizes case and surrounding whitespace", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("accepts a valid address", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidEmail("user@example")).toBe(false);
    expect(isValidEmail("user example.com")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
  });
});

describe("session activity", () => {
  it("accepts a session that is neither revoked nor expired", () => {
    expect(isSessionActive(session(), NOW)).toBe(true);
  });

  it("rejects a revoked session", () => {
    expect(isSessionActive(session({ revokedAt: NOW }), NOW)).toBe(false);
  });

  it("rejects an expired session", () => {
    expect(isSessionActive(session({ expiresAt: NOW }), NOW)).toBe(false);
  });
});

describe("one-time token usability", () => {
  const token = {
    id: "token-1",
    userId: "user-1",
    type: "email_confirmation" as const,
    tokenHash: "hash",
    expiresAt: new Date(NOW.getTime() + 1_000),
    usedAt: null,
    createdAt: NOW,
  };

  it("accepts an unused, unexpired token", () => {
    expect(isTokenUsable(token, NOW)).toBe(true);
  });

  it("rejects a used token", () => {
    expect(isTokenUsable({ ...token, usedAt: NOW }, NOW)).toBe(false);
  });

  it("rejects an expired token", () => {
    expect(isTokenUsable({ ...token, expiresAt: NOW }, NOW)).toBe(false);
  });
});

describe("public user", () => {
  it("removes the password hash", () => {
    const publicUser = toPublicUser({
      id: "user-1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "secret-hash",
      emailConfirmedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(publicUser).not.toHaveProperty("passwordHash");
    expect(publicUser.email).toBe("ada@example.com");
  });
});

describe("system clock", () => {
  it("returns the current time", () => {
    const before = Date.now();
    const now = systemClock.now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
