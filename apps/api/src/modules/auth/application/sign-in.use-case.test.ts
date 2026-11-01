import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PasswordHasher } from "../domain/password-hasher";
import {
  EmailNotConfirmedError,
  InvalidCredentialsError,
} from "../domain/errors";
import { FakeEmailService } from "../testing/fake-email.service";
import {
  FixedClock,
  InMemoryAuthSessionRepository,
  InMemoryAuthUserRepository,
  InMemoryTransactionManager,
  SequentialTokenGenerator,
} from "../testing/in-memory-repositories";
import { SessionService } from "./session.service";
import { SignInUseCase } from "./sign-in.use-case";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const PASSWORD = "correct-horse";

class DeterministicPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

describe("SignInUseCase", () => {
  let clock: FixedClock;
  let sessions: InMemoryAuthSessionRepository;
  let users: InMemoryAuthUserRepository;
  let email: FakeEmailService;
  let sessionService: SessionService;
  let useCase: SignInUseCase;

  beforeEach(async () => {
    clock = new FixedClock(NOW);
    sessions = new InMemoryAuthSessionRepository();
    users = new InMemoryAuthUserRepository();
    email = new FakeEmailService();
    sessionService = new SessionService(
      sessions,
      new SequentialTokenGenerator(),
      clock,
      users,
      email,
    );
    useCase = new SignInUseCase(
      new InMemoryTransactionManager(),
      users,
      new DeterministicPasswordHasher(),
      sessionService,
    );

    const user = await users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: `hashed:${PASSWORD}`,
    });
    await users.markEmailConfirmed(user.id, NOW);
  });

  it("rejects an unknown e-mail without creating a session", async () => {
    await expect(
      useCase.execute({ email: "nobody@example.com", password: PASSWORD }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(sessions.sessions).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("rejects a wrong password without creating a session", async () => {
    await expect(
      useCase.execute({ email: "ada@example.com", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(sessions.sessions).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("rejects an unconfirmed account even with the correct password", async () => {
    await users.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      passwordHash: `hashed:${PASSWORD}`,
    });

    await expect(
      useCase.execute({ email: "grace@example.com", password: PASSWORD }),
    ).rejects.toBeInstanceOf(EmailNotConfirmedError);

    expect(sessions.sessions).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("creates a session, revokes the previous one and sends the new-session e-mail", async () => {
    const first = await useCase.execute({
      email: "ada@example.com",
      password: PASSWORD,
    });

    clock.advance(1_000);

    const second = await useCase.execute({
      email: "ada@example.com",
      password: PASSWORD,
      userAgent: "vitest",
      requestId: "request-2",
    });

    expect(second.token).not.toBe(first.token);
    expect(second.user).toMatchObject({
      email: "ada@example.com",
      emailConfirmedAt: NOW,
    });
    expect(second.user).not.toHaveProperty("passwordHash");
    expect(sessions.sessions).toHaveLength(2);
    expect(sessions.sessions[0]?.revokedAt).toEqual(clock.now());
    expect(await sessionService.validate(first.token)).toBeNull();
    expect(await sessionService.validate(second.token)).toBe(
      users.users[0]?.id,
    );
    expect(
      email.sent.filter((sent) => sent.template === "new_session"),
    ).toHaveLength(2);
    expect(email.sent.at(-1)).toMatchObject({
      to: "ada@example.com",
      template: "new_session",
      userAgent: "vitest",
    });
  });

  it("normalizes the e-mail before looking the account up", async () => {
    const result = await useCase.execute({
      email: "  ADA@example.com ",
      password: PASSWORD,
    });

    expect(result.user.email).toBe("ada@example.com");
  });

  it("never logs the password or the session token", async () => {
    const logSpy = vi
      .spyOn(Logger.prototype, "log")
      .mockImplementation(() => undefined);
    const warnSpy = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);

    const result = await useCase.execute({
      email: "ada@example.com",
      password: PASSWORD,
      requestId: "request-3",
    });
    await expect(
      useCase.execute({ email: "ada@example.com", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    const logged = JSON.stringify([
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
    ]);

    expect(logged).toContain("auth.sign_in.succeeded");
    expect(logged).toContain("auth.sign_in.failed");
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain("wrong-password");
    expect(logged).not.toContain(result.token);

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
