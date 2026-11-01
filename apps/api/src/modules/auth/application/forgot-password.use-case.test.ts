import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordUseCase } from "./forgot-password.use-case";
import { OneTimeTokenService } from "./one-time-token.service";
import { PASSWORD_RESET_TTL_MS } from "../domain/auth-token";
import {
  FixedClock,
  InMemoryAuthTokenRepository,
  InMemoryAuthUserRepository,
  SequentialTokenGenerator,
} from "../testing/in-memory-repositories";
import { FakeEmailService } from "../testing/fake-email.service";

const NOW = new Date("2026-01-01T00:00:00.000Z");

class FailingEmailService extends FakeEmailService {
  override async sendPasswordResetEmail(): Promise<void> {
    throw new Error("smtp down");
  }
}

describe("ForgotPasswordUseCase", () => {
  let clock: FixedClock;
  let users: InMemoryAuthUserRepository;
  let tokens: InMemoryAuthTokenRepository;
  let email: FakeEmailService;
  let generator: SequentialTokenGenerator;
  let oneTimeTokens: OneTimeTokenService;

  function buildUseCase(
    emailService: FakeEmailService = email,
  ): ForgotPasswordUseCase {
    return new ForgotPasswordUseCase(users, oneTimeTokens, emailService);
  }

  async function seedUser(confirmed: boolean) {
    const user = await users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed-password",
    });

    if (confirmed) {
      user.emailConfirmedAt = NOW;
    }

    return user;
  }

  beforeEach(() => {
    clock = new FixedClock(NOW);
    users = new InMemoryAuthUserRepository();
    tokens = new InMemoryAuthTokenRepository();
    email = new FakeEmailService();
    generator = new SequentialTokenGenerator();
    oneTimeTokens = new OneTimeTokenService(tokens, generator, clock);
  });

  it("issues a one-hour reset token and sends the reset e-mail for a confirmed account", async () => {
    const user = await seedUser(true);

    await buildUseCase().execute({ email: "ADA@example.com" });

    expect(tokens.tokens).toHaveLength(1);
    expect(tokens.tokens[0]).toMatchObject({
      userId: user.id,
      type: "password_reset",
      tokenHash: "hashed:token-1",
      usedAt: null,
      expiresAt: new Date(NOW.getTime() + PASSWORD_RESET_TTL_MS),
    });
    expect(email.sent).toEqual([
      {
        to: "ada@example.com",
        template: "password_reset",
        token: "token-1",
        expiresAt: new Date(NOW.getTime() + PASSWORD_RESET_TTL_MS),
      },
    ]);
  });

  it("does not issue a token nor send e-mail for an unknown address", async () => {
    await buildUseCase().execute({ email: "nobody@example.com" });

    expect(tokens.tokens).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("does not issue a token nor send e-mail for an unconfirmed account", async () => {
    await seedUser(false);

    await buildUseCase().execute({ email: "ada@example.com" });

    expect(tokens.tokens).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("invalidates the previous reset token when a new one is requested", async () => {
    await seedUser(true);
    const useCase = buildUseCase();

    await useCase.execute({ email: "ada@example.com" });
    await useCase.execute({ email: "ada@example.com" });

    expect(tokens.tokens[0]?.usedAt).toEqual(NOW);
    expect(tokens.tokens[1]?.usedAt).toBeNull();
    expect(email.sent).toHaveLength(2);
  });

  it("swallows e-mail delivery failures and logs without the token or the address", async () => {
    await seedUser(true);
    const errorSpy = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);

    await expect(
      buildUseCase(new FailingEmailService()).execute({
        email: "ada@example.com",
        requestId: "request-9",
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.forgot_password.email_failed",
        requestId: "request-9",
      }),
    );

    const logged = JSON.stringify(errorSpy.mock.calls);

    expect(logged).not.toContain("token-1");
    expect(logged).not.toContain("ada@example.com");

    errorSpy.mockRestore();
  });

  it("logs the request with its request id and never prints the token or the address", async () => {
    await seedUser(true);
    const logSpy = vi
      .spyOn(Logger.prototype, "log")
      .mockImplementation(() => undefined);

    await buildUseCase().execute({
      email: "ada@example.com",
      requestId: "request-10",
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.forgot_password.email_sent",
        requestId: "request-10",
      }),
    );

    const logged = JSON.stringify(logSpy.mock.calls);

    expect(logged).not.toContain("token-1");
    expect(logged).not.toContain("ada@example.com");

    logSpy.mockRestore();
  });
});
