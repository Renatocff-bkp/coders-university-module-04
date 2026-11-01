import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_TTL_MS } from "../domain/auth-session";
import { InvalidTokenError } from "../domain/errors";
import { FakeEmailService } from "../testing/fake-email.service";
import {
  FixedClock,
  InMemoryAuthSessionRepository,
  InMemoryAuthUserRepository,
  SequentialTokenGenerator,
} from "../testing/in-memory-repositories";
import { SessionService } from "./session.service";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("SessionService", () => {
  let clock: FixedClock;
  let sessions: InMemoryAuthSessionRepository;
  let users: InMemoryAuthUserRepository;
  let email: FakeEmailService;
  let tokens: SequentialTokenGenerator;
  let service: SessionService;

  beforeEach(() => {
    clock = new FixedClock(NOW);
    sessions = new InMemoryAuthSessionRepository();
    users = new InMemoryAuthUserRepository();
    email = new FakeEmailService();
    tokens = new SequentialTokenGenerator();
    service = new SessionService(sessions, tokens, clock, users, email);
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

  it("sends the new-session e-mail with the session id", async () => {
    const user = await users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed-password",
    });

    const created = await service.create({
      userId: user.id,
      userAgent: "vitest",
      requestId: "request-1",
    });

    expect(email.sent).toEqual([
      {
        to: "ada@example.com",
        template: "new_session",
        sessionId: created.sessionId,
        createdAt: NOW,
        userAgent: "vitest",
      },
    ]);
  });

  it("keeps the session when the new-session e-mail fails", async () => {
    const errorSpy = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const user = await users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed-password",
    });
    vi.spyOn(email, "sendNewSessionEmail").mockRejectedValue(
      new Error("mailer down"),
    );

    const created = await service.create({
      userId: user.id,
      requestId: "request-2",
    });

    expect(sessions.sessions).toHaveLength(1);
    expect(await service.validate(created.token)).toBe(user.id);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.session.new_session_email_failed",
        userId: user.id,
        requestId: "request-2",
      }),
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(created.token);
  });
});
