import { beforeEach, describe, expect, it } from "vitest";

import { SESSION_TTL_MS } from "../domain/auth-session";
import { InvalidTokenError } from "../domain/errors";
import {
  FixedClock,
  InMemoryAuthSessionRepository,
  SequentialTokenGenerator,
} from "../testing/in-memory-repositories";
import { SessionService } from "./session.service";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("SessionService", () => {
  let clock: FixedClock;
  let sessions: InMemoryAuthSessionRepository;
  let tokens: SequentialTokenGenerator;
  let service: SessionService;

  beforeEach(() => {
    clock = new FixedClock(NOW);
    sessions = new InMemoryAuthSessionRepository();
    tokens = new SequentialTokenGenerator();
    service = new SessionService(sessions, tokens, clock);
  });

  it("creates a session persisting only the token hash", async () => {
    const created = await service.create({
      userId: "user-1",
      userAgent: "vitest",
      ipAddress: "127.0.0.1",
    });

    expect(created.token).toBe("token-1");
    expect(created.sessionId).toBe(sessions.sessions[0]?.id);
    expect(created.expiresAt).toEqual(new Date(NOW.getTime() + SESSION_TTL_MS));
    expect(sessions.sessions[0]).toMatchObject({
      userId: "user-1",
      tokenHash: "hashed:token-1",
      userAgent: "vitest",
      ipAddress: "127.0.0.1",
      revokedAt: null,
      lastUsedAt: null,
    });
    expect(sessions.sessions[0]).not.toHaveProperty("token");
    expect(sessions.sessions[0]?.tokenHash).not.toBe("token-1");
  });

  it("stores null metadata when none is provided", async () => {
    await service.create({ userId: "user-1" });

    expect(sessions.sessions[0]).toMatchObject({
      userAgent: null,
      ipAddress: null,
    });
  });

  it("revokes previous sessions when a new one is created", async () => {
    const first = await service.create({ userId: "user-1" });
    const second = await service.create({ userId: "user-1" });

    expect(sessions.sessions[0]?.revokedAt).toEqual(NOW);
    expect(await service.validate(first.token)).toBeNull();
    expect(await service.validate(second.token)).toBe("user-1");
  });

  it("validates a session and records last usage", async () => {
    const created = await service.create({ userId: "user-1" });

    clock.advance(1_000);

    expect(await service.validate(created.token)).toBe("user-1");
    expect(sessions.sessions[0]?.lastUsedAt).toEqual(clock.now());
  });

  it("rejects unknown and empty tokens", async () => {
    expect(await service.validate("unknown")).toBeNull();
    expect(await service.validate("")).toBeNull();
  });

  it("rejects an expired session", async () => {
    const created = await service.create({ userId: "user-1" });

    clock.advance(SESSION_TTL_MS);

    expect(await service.validate(created.token)).toBeNull();
  });

  it("revokes a session by token", async () => {
    const created = await service.create({ userId: "user-1" });

    await service.revoke(created.token);

    expect(sessions.sessions[0]?.revokedAt).toEqual(NOW);
    expect(await service.validate(created.token)).toBeNull();
  });

  it("fails to revoke an unknown token", async () => {
    await expect(service.revoke("unknown")).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });

  it("revokes every active session of a user", async () => {
    await service.create({ userId: "user-1" });

    expect(await service.revokeAll("user-1")).toBe(1);
    expect(await service.revokeAll("user-1")).toBe(0);
  });
});
