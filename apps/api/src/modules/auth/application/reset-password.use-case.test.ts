import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  EMAIL_CONFIRMATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
} from "../domain/auth-token";
import type { AuthSession } from "../domain/auth-session";
import { InvalidTokenError } from "../domain/errors";
import type { EmailService } from "../domain/email-service";
import type { PasswordHasher } from "../domain/password-hasher";
import { FakeEmailService } from "../testing/fake-email.service";
import {
  FixedClock,
  InMemoryAuthSessionRepository,
  InMemoryAuthTokenRepository,
  InMemoryAuthUserRepository,
  InMemoryTransactionManager,
  SequentialTokenGenerator,
} from "../testing/in-memory-repositories";
import { OneTimeTokenService } from "./one-time-token.service";
import { ResetPasswordUseCase } from "./reset-password.use-case";
import { SessionService } from "./session.service";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const NEW_PASSWORD = "brand-new-secret";

class DeterministicPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

class FailingSessionRepository extends InMemoryAuthSessionRepository {
  override async revokeActiveByUserId(): Promise<number> {
    throw new Error("database unavailable");
  }
}

class FailingEmailService extends FakeEmailService {
  override async sendPasswordChangedEmail(): Promise<void> {
    throw new Error("smtp down");
  }
}

describe("ResetPasswordUseCase", () => {
  let clock: FixedClock;
  let users: InMemoryAuthUserRepository;
  let sessions: InMemoryAuthSessionRepository;
  let tokens: InMemoryAuthTokenRepository;
  let email: FakeEmailService;
  let generator: SequentialTokenGenerator;
  let oneTimeTokens: OneTimeTokenService;
  let transactions: InMemoryTransactionManager;

  function buildUseCase(
    emailService: EmailService = email,
    sessionRepository: InMemoryAuthSessionRepository = sessions,
  ): ResetPasswordUseCase {
    const sessionService = new SessionService(
      sessionRepository,
      generator,
      clock,
      users,
      emailService,
    );

    return new ResetPasswordUseCase(
      transactions,
      oneTimeTokens,
      users,
      sessionService,
      new DeterministicPasswordHasher(),
      emailService,
      clock,
    );
  }

  async function seedUser(passwordHash = "hashed:old-password") {
    return users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash,
    });
  }

  async function seedActiveSession(userId: string): Promise<AuthSession> {
    return sessions.create({
      userId,
      tokenHash: `hashed:session-${userId}`,
      userAgent: null,
      ipAddress: null,
      expiresAt: new Date(NOW.getTime() + 1000 * 60 * 60),
    });
  }

  async function issueResetToken(userId: string): Promise<string> {
    const issued = await oneTimeTokens.issue(
      userId,
      "password_reset",
      PASSWORD_RESET_TTL_MS,
    );

    return issued.token;
  }

  beforeEach(() => {
    clock = new FixedClock(NOW);
    users = new InMemoryAuthUserRepository();
    sessions = new InMemoryAuthSessionRepository();
    tokens = new InMemoryAuthTokenRepository();
    email = new FakeEmailService();
    generator = new SequentialTokenGenerator();
    oneTimeTokens = new OneTimeTokenService(tokens, generator, clock);
    transactions = new InMemoryTransactionManager([users, sessions, tokens]);
  });

  it("replaces the password hash, consumes the token and revokes every active session", async () => {
    const user = await seedUser();
    const token = await issueResetToken(user.id);
    await seedActiveSession(user.id);
    await seedActiveSession(user.id);

    await buildUseCase().execute({ token, password: NEW_PASSWORD });

    expect(users.users[0]?.passwordHash).toBe(`hashed:${NEW_PASSWORD}`);
    expect(users.users[0]?.updatedAt).toEqual(NOW);
    expect(tokens.tokens[0]?.usedAt).toEqual(NOW);
    expect(
      sessions.sessions.every((session) => session.revokedAt !== null),
    ).toBe(true);
  });

  it("sends the password-changed e-mail without the token or the password", async () => {
    const user = await seedUser();
    const token = await issueResetToken(user.id);

    await buildUseCase().execute({ token, password: NEW_PASSWORD });

    expect(email.sent).toEqual([
      { to: "ada@example.com", template: "password_changed" },
    ]);
    expect(JSON.stringify(email.sent)).not.toContain(NEW_PASSWORD);
    expect(JSON.stringify(email.sent)).not.toContain(token);
  });

  it("rejects a missing or blank token without touching the password", async () => {
    const user = await seedUser();
    await seedActiveSession(user.id);

    await expect(
      buildUseCase().execute({ token: "   ", password: NEW_PASSWORD }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(
      buildUseCase().execute({
        token: undefined as unknown as string,
        password: NEW_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(InvalidTokenError);

    expect(users.users[0]?.passwordHash).toBe("hashed:old-password");
    expect(sessions.sessions[0]?.revokedAt).toBeNull();
    expect(email.sent).toHaveLength(0);
  });

  it("rejects an unknown token without changing the password", async () => {
    const user = await seedUser();

    await expect(
      buildUseCase().execute({
        token: "unknown-token",
        password: NEW_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(InvalidTokenError);

    expect(users.users[0]?.passwordHash).toBe("hashed:old-password");
    expect(users.users[0]?.id).toBe(user.id);
    expect(email.sent).toHaveLength(0);
  });

  it("rejects an expired token", async () => {
    const user = await seedUser();
    const token = await issueResetToken(user.id);

    clock.advance(PASSWORD_RESET_TTL_MS);

    await expect(
      buildUseCase().execute({ token, password: NEW_PASSWORD }),
    ).rejects.toBeInstanceOf(InvalidTokenError);

    expect(users.users[0]?.passwordHash).toBe("hashed:old-password");
  });

  it("rejects a token of another type", async () => {
    const user = await seedUser();
    const issued = await oneTimeTokens.issue(
      user.id,
      "email_confirmation",
      EMAIL_CONFIRMATION_TTL_MS,
    );

    await expect(
      buildUseCase().execute({ token: issued.token, password: NEW_PASSWORD }),
    ).rejects.toBeInstanceOf(InvalidTokenError);

    expect(users.users[0]?.passwordHash).toBe("hashed:old-password");
    expect(tokens.tokens[0]?.usedAt).toBeNull();
  });

  it("does not accept the same token twice", async () => {
    const user = await seedUser();
    const token = await issueResetToken(user.id);
    const useCase = buildUseCase();

    await useCase.execute({ token, password: NEW_PASSWORD });

    await expect(
      useCase.execute({ token, password: "another-secret" }),
    ).rejects.toBeInstanceOf(InvalidTokenError);

    expect(users.users[0]?.passwordHash).toBe(`hashed:${NEW_PASSWORD}`);
    expect(email.sent).toHaveLength(1);
  });

  it("rolls back the password and the token when session revocation fails", async () => {
    const user = await seedUser();
    const token = await issueResetToken(user.id);
    const failingSessions = new FailingSessionRepository();
    transactions = new InMemoryTransactionManager([
      users,
      failingSessions,
      tokens,
    ]);

    await expect(
      buildUseCase(email, failingSessions).execute({
        token,
        password: NEW_PASSWORD,
      }),
    ).rejects.toThrow("database unavailable");

    expect(users.users[0]?.passwordHash).toBe("hashed:old-password");
    expect(tokens.tokens[0]?.usedAt).toBeNull();
    expect(email.sent).toHaveLength(0);
  });

  it("swallows e-mail failures and logs without the token, the password or the address", async () => {
    const user = await seedUser();
    const token = await issueResetToken(user.id);
    const errorSpy = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);

    await expect(
      buildUseCase(new FailingEmailService()).execute({
        token,
        password: NEW_PASSWORD,
        requestId: "request-reset-1",
      }),
    ).resolves.toBeUndefined();

    expect(users.users[0]?.passwordHash).toBe(`hashed:${NEW_PASSWORD}`);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.reset_password.email_failed",
        userId: user.id,
        requestId: "request-reset-1",
      }),
    );

    const logged = JSON.stringify(errorSpy.mock.calls);

    expect(logged).not.toContain(token);
    expect(logged).not.toContain(NEW_PASSWORD);
    expect(logged).not.toContain("ada@example.com");

    errorSpy.mockRestore();
  });
});
