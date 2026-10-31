import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMAIL_CONFIRMATION_TTL_MS } from "../domain/auth-token";
import type { AuthUser } from "../domain/auth-user";
import type { PasswordHasher } from "../domain/password-hasher";
import { SignUpValidationError } from "../domain/errors";
import type { EmailService } from "../domain/email-service";
import { FakeEmailService } from "../testing/fake-email.service";
import {
  FixedClock,
  InMemoryAuthSessionRepository,
  InMemoryAuthTokenRepository,
  InMemoryAuthUserRepository,
  SequentialTokenGenerator,
} from "../testing/in-memory-repositories";
import { OneTimeTokenService } from "./one-time-token.service";
import { SignUpUseCase } from "./sign-up.use-case";

const NOW = new Date("2026-01-01T00:00:00.000Z");

class DeterministicPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

class FailingEmailService implements EmailService {
  async sendEmailConfirmation(): Promise<void> {
    throw new Error("mailer down");
  }

  async sendNewSessionEmail(): Promise<void> {
    throw new Error("mailer down");
  }

  async sendPasswordResetEmail(): Promise<void> {
    throw new Error("mailer down");
  }

  async sendPasswordChangedEmail(): Promise<void> {
    throw new Error("mailer down");
  }
}

const VALID_INPUT = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "correct-horse",
  passwordConfirmation: "correct-horse",
};

describe("SignUpUseCase", () => {
  let users: InMemoryAuthUserRepository;
  let sessions: InMemoryAuthSessionRepository;
  let tokens: InMemoryAuthTokenRepository;
  let email: FakeEmailService;
  let clock: FixedClock;
  let useCase: SignUpUseCase;

  function buildUseCase(mailer: EmailService = email): SignUpUseCase {
    return new SignUpUseCase(
      users,
      new DeterministicPasswordHasher(),
      new OneTimeTokenService(tokens, new SequentialTokenGenerator(), clock),
      mailer,
    );
  }

  beforeEach(() => {
    users = new InMemoryAuthUserRepository();
    sessions = new InMemoryAuthSessionRepository();
    tokens = new InMemoryAuthTokenRepository();
    email = new FakeEmailService();
    clock = new FixedClock(NOW);
    useCase = buildUseCase();
  });

  it("creates an unconfirmed user with a hashed password and no session", async () => {
    const outcome = await useCase.execute({
      ...VALID_INPUT,
      requestId: "request-1",
    });

    expect(outcome).toBe("created");
    expect(users.users).toHaveLength(1);
    expect(users.users[0]).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed:correct-horse",
      emailConfirmedAt: null,
    });
    expect(sessions.sessions).toHaveLength(0);

    const confirmation = email.sent[0];

    expect(confirmation).toMatchObject({
      to: "ada@example.com",
      template: "email_confirmation",
      token: "token-1",
    });
    expect(confirmation?.expiresAt).toEqual(
      new Date(NOW.getTime() + EMAIL_CONFIRMATION_TTL_MS),
    );
  });

  it("normalizes the email and trims the names", async () => {
    await useCase.execute({
      ...VALID_INPUT,
      firstName: "  Ada  ",
      lastName: "  Lovelace  ",
      email: "  Ada@Example.COM ",
    });

    expect(users.users[0]).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    });
    expect(email.sent[0]?.to).toBe("ada@example.com");
  });

  it("does not duplicate an unconfirmed user and reissues the token", async () => {
    await useCase.execute(VALID_INPUT);
    const firstTokenId = tokens.tokens[0]?.id;

    const outcome = await useCase.execute({
      ...VALID_INPUT,
      email: "ADA@example.com",
    });

    expect(outcome).toBe("confirmation_resent");
    expect(users.users).toHaveLength(1);
    expect(tokens.tokens[0]?.usedAt).toEqual(NOW);
    expect(tokens.tokens[0]?.id).toBe(firstTokenId);
    expect(tokens.tokens[1]?.usedAt).toBeNull();
    expect(email.sent).toHaveLength(2);
    expect(email.sent[1]?.token).toBe("token-2");
  });

  it("does not send a confirmation e-mail for a confirmed account", async () => {
    const user = await users.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      passwordHash: "hashed:correct-horse",
    });
    user.emailConfirmedAt = NOW;
    email.sent.length = 0;

    const outcome = await useCase.execute({
      ...VALID_INPUT,
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
    });

    expect(outcome).toBe("confirmation_skipped");
    expect(users.users).toHaveLength(1);
    expect(tokens.tokens).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("rejects invalid payloads without creating a user", async () => {
    await expect(
      useCase.execute({
        ...VALID_INPUT,
        firstName: " ",
        email: "not-an-email",
        passwordConfirmation: "different-password",
      }),
    ).rejects.toBeInstanceOf(SignUpValidationError);

    expect(users.users).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("keeps the generic outcome when the mailer fails", async () => {
    const errorSpy = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    useCase = buildUseCase(new FailingEmailService());

    const outcome = await useCase.execute(VALID_INPUT);

    expect(outcome).toBe("created");
    expect(users.users).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.sign_up.confirmation_email_failed",
      }),
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("token-1");
  });
});
