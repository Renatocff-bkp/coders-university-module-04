import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionService } from "./session.service";
import { OneTimeTokenService } from "./one-time-token.service";
import { ConfirmAccountUseCase } from "./confirm-account.use-case";
import { EMAIL_CONFIRMATION_TTL_MS } from "../domain/auth-token";
import type { AuthSession } from "../domain/auth-session";
import { InvalidTokenError } from "../domain/errors";
import { FakeEmailService } from "../testing/fake-email.service";
import {
  FixedClock,
  InMemoryAuthSessionRepository,
  InMemoryAuthTokenRepository,
  InMemoryAuthUserRepository,
  InMemoryTransactionManager,
  SequentialTokenGenerator,
} from "../testing/in-memory-repositories";

const NOW = new Date("2026-01-01T00:00:00.000Z");

class FailingSessionRepository extends InMemoryAuthSessionRepository {
  override async create(): Promise<AuthSession> {
    throw new Error("database down");
  }
}

describe("ConfirmAccountUseCase", () => {
  let clock: FixedClock;
  let users: InMemoryAuthUserRepository;
  let sessions: InMemoryAuthSessionRepository;
  let tokens: InMemoryAuthTokenRepository;
  let email: FakeEmailService;
  let generator: SequentialTokenGenerator;
  let oneTimeTokens: OneTimeTokenService;
  let sessionService: SessionService;
  let useCase: ConfirmAccountUseCase;

  function buildUseCase(
    sessionRepository: InMemoryAuthSessionRepository = sessions,
  ): ConfirmAccountUseCase {
    const transactions = new InMemoryTransactionManager([
      users,
      sessionRepository,
      tokens,
    ]);
    const tokenService = new OneTimeTokenService(tokens, generator, clock);
    const sessionsService = new SessionService(
      sessionRepository,
      generator,
      clock,
      users,
      email,
    );

    return new ConfirmAccountUseCase(
      transactions,
      tokenService,
      users,
      sessionsService,
      clock,
    );
  }

  async function seedToken(type: "email_confirmation" | "password_reset") {
    const user = await users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed-password",
    });
    const issued = await oneTimeTokens.issue(
      user.id,
      type,
      EMAIL_CONFIRMATION_TTL_MS,
    );

    return { user, issued };
  }

  beforeEach(() => {
    clock = new FixedClock(NOW);
    users = new InMemoryAuthUserRepository();
    sessions = new InMemoryAuthSessionRepository();
    tokens = new InMemoryAuthTokenRepository();
    email = new FakeEmailService();
    generator = new SequentialTokenGenerator();
    oneTimeTokens = new OneTimeTokenService(tokens, generator, clock);
    sessionService = new SessionService(
      sessions,
      generator,
      clock,
      users,
      email,
    );
    useCase = new ConfirmAccountUseCase(
      new InMemoryTransactionManager([users, sessions, tokens]),
      oneTimeTokens,
      users,
      sessionService,
      clock,
    );
  });

  it("confirms the account, consumes the token and creates a session", async () => {
    const { user, issued } = await seedToken("email_confirmation");

    const result = await useCase.execute({
      token: issued.token,
      userAgent: "vitest",
      ipAddress: "127.0.0.1",
      requestId: "request-1",
    });

    expect(result.user).toMatchObject({
      id: user.id,
      email: "ada@example.com",
      emailConfirmedAt: NOW,
    });
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(users.users[0]?.emailConfirmedAt).toEqual(NOW);
    expect(tokens.tokens[0]?.usedAt).toEqual(NOW);
    expect(sessions.sessions).toHaveLength(1);
    expect(sessions.sessions[0]).toMatchObject({
      userId: user.id,
      tokenHash: `hashed:${result.token}`,
      userAgent: "vitest",
      ipAddress: "127.0.0.1",
    });
    expect(email.sent).toEqual([
      {
        to: "ada@example.com",
        template: "new_session",
        sessionId: sessions.sessions[0]?.id,
        createdAt: NOW,
        userAgent: "vitest",
      },
    ]);
  });

  it("rejects the same token the second time", async () => {
    const { issued } = await seedToken("email_confirmation");

    await useCase.execute({ token: issued.token });

    await expect(
      useCase.execute({ token: issued.token }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    expect(sessions.sessions).toHaveLength(1);
    expect(email.sent).toHaveLength(1);
  });

  it("rejects an expired token without confirming the account", async () => {
    const { user, issued } = await seedToken("email_confirmation");

    clock.advance(EMAIL_CONFIRMATION_TTL_MS);

    await expect(
      useCase.execute({ token: issued.token }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    expect(users.users[0]?.emailConfirmedAt).toBeNull();
    expect(sessions.sessions).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("rejects a token of another type", async () => {
    const { issued } = await seedToken("password_reset");

    await expect(
      useCase.execute({ token: issued.token }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    expect(users.users[0]?.emailConfirmedAt).toBeNull();
    expect(sessions.sessions).toHaveLength(0);
  });

  it("rejects unknown and empty tokens", async () => {
    await expect(
      useCase.execute({ token: "unknown-token" }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(useCase.execute({ token: "   " })).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });

  it("rolls back the token and the confirmation when session creation fails", async () => {
    const failingSessions = new FailingSessionRepository();
    const failingUseCase = buildUseCase(failingSessions);
    const { issued } = await seedToken("email_confirmation");

    await expect(
      failingUseCase.execute({ token: issued.token }),
    ).rejects.toThrow("database down");

    expect(users.users[0]?.emailConfirmedAt).toBeNull();
    expect(tokens.tokens[0]?.usedAt).toBeNull();
    expect(failingSessions.sessions).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("logs with the request id and never prints the token", async () => {
    const logSpy = vi
      .spyOn(Logger.prototype, "log")
      .mockImplementation(() => undefined);
    const { issued } = await seedToken("email_confirmation");

    await useCase.execute({ token: issued.token, requestId: "request-2" });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.confirm_account.succeeded",
        requestId: "request-2",
      }),
    );
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain(issued.token);
  });
});
