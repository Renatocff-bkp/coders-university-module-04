import type { INestApplication } from "@nestjs/common";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { HttpExceptionFilter } from "../../../shared/http/http-exception.filter";
import { flattenValidationErrors } from "../../../shared/http/validation";
import { OneTimeTokenService } from "../application/one-time-token.service";
import { ResetPasswordUseCase } from "../application/reset-password.use-case";
import { AuthModule } from "../auth.module";
import {
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_REPOSITORY,
  AUTH_USER_REPOSITORY,
  CLOCK,
  EMAIL_SERVICE,
  PASSWORD_HASHER,
  SESSION_TTL_MS,
  TRANSACTION_MANAGER,
} from "../auth.tokens";
import { PASSWORD_RESET_TTL_MS } from "../domain/auth-token";
import type { AuthUser } from "../domain/auth-user";
import type { PasswordHasher } from "../domain/password-hasher";
import { FakeEmailService } from "../testing/fake-email.service";
import {
  FixedClock,
  InMemoryAuthSessionRepository,
  InMemoryAuthTokenRepository,
  InMemoryAuthUserRepository,
  InMemoryTransactionManager,
} from "../testing/in-memory-repositories";
import { INVALID_TOKEN_MESSAGE } from "./confirm-account.controller";

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

describe("POST /api/v1/auth/reset-password", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let clock: FixedClock;
  let users: InMemoryAuthUserRepository;
  let sessions: InMemoryAuthSessionRepository;
  let tokens: InMemoryAuthTokenRepository;
  let email: FakeEmailService;
  let oneTimeTokens: OneTimeTokenService;

  async function createUser(emailAddress: string): Promise<AuthUser> {
    return users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: emailAddress,
      passwordHash: "hashed:old-password",
    });
  }

  async function issueToken(
    user: AuthUser,
    type: "email_confirmation" | "password_reset" = "password_reset",
  ): Promise<string> {
    const issued = await oneTimeTokens.issue(
      user.id,
      type,
      PASSWORD_RESET_TTL_MS,
    );

    return issued.token;
  }

  function resetPassword(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .send(body);
  }

  beforeAll(async () => {
    clock = new FixedClock(NOW);
    users = new InMemoryAuthUserRepository();
    sessions = new InMemoryAuthSessionRepository();
    tokens = new InMemoryAuthTokenRepository();
    email = new FakeEmailService();

    moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(AUTH_USER_REPOSITORY)
      .useValue(users)
      .overrideProvider(AUTH_SESSION_REPOSITORY)
      .useValue(sessions)
      .overrideProvider(AUTH_TOKEN_REPOSITORY)
      .useValue(tokens)
      .overrideProvider(TRANSACTION_MANAGER)
      .useValue(new InMemoryTransactionManager([users, sessions, tokens]))
      .overrideProvider(PASSWORD_HASHER)
      .useValue(new DeterministicPasswordHasher())
      .overrideProvider(CLOCK)
      .useValue(clock)
      .overrideProvider(SESSION_TTL_MS)
      .useValue(7 * 24 * 60 * 60 * 1000)
      .overrideProvider(EMAIL_SERVICE)
      .useValue(email)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) =>
          new BadRequestException({
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            fields: flattenValidationErrors(errors),
          }),
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    expect(moduleRef.get(ResetPasswordUseCase)).toBeInstanceOf(
      ResetPasswordUseCase,
    );
    oneTimeTokens = moduleRef.get(OneTimeTokenService);
  });

  beforeEach(() => {
    users.users.length = 0;
    sessions.sessions.length = 0;
    tokens.tokens.length = 0;
    email.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 204, replaces the password, consumes the token and revokes sessions", async () => {
    const user = await createUser("ada@example.com");
    const token = await issueToken(user);
    await sessions.create({
      userId: user.id,
      tokenHash: "hashed:session-a",
      userAgent: null,
      ipAddress: null,
      expiresAt: new Date(NOW.getTime() + 60_000),
    });

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .set("x-request-id", "reset-1")
      .send({
        token,
        password: NEW_PASSWORD,
        passwordConfirmation: NEW_PASSWORD,
      });

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(users.users[0]?.passwordHash).toBe(`hashed:${NEW_PASSWORD}`);
    expect(tokens.tokens[0]?.usedAt).toEqual(NOW);
    expect(sessions.sessions.every((s) => s.revokedAt !== null)).toBe(true);
    expect(email.sent).toEqual([
      { to: "ada@example.com", template: "password_changed" },
    ]);
    expect(JSON.stringify(email.sent)).not.toContain(NEW_PASSWORD);
    expect(JSON.stringify(email.sent)).not.toContain(token);
  });

  it("returns the same 410 when the token was already used", async () => {
    const user = await createUser("grace@example.com");
    const token = await issueToken(user);
    const body = {
      token,
      password: NEW_PASSWORD,
      passwordConfirmation: NEW_PASSWORD,
    };

    await resetPassword(body).expect(204);

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .set("x-request-id", "reset-reused")
      .send(body);

    expect(response.status).toBe(410);
    expect(response.body.error).toMatchObject({
      code: "INVALID_TOKEN",
      message: INVALID_TOKEN_MESSAGE,
      requestId: "reset-reused",
    });
    expect(JSON.stringify(response.body)).not.toContain(token);
  });

  it("returns 410 for an expired token without changing the password", async () => {
    const user = await createUser("expired@example.com");
    const token = await issueToken(user);

    clock.advance(PASSWORD_RESET_TTL_MS);

    const response = await resetPassword({
      token,
      password: NEW_PASSWORD,
      passwordConfirmation: NEW_PASSWORD,
    });

    expect(response.status).toBe(410);
    expect(response.body.error).toMatchObject({ code: "INVALID_TOKEN" });
    expect(users.users[0]?.passwordHash).toBe("hashed:old-password");
  });

  it("returns 410 for a token of another type", async () => {
    const user = await createUser("other-type@example.com");
    const token = await issueToken(user, "email_confirmation");

    const response = await resetPassword({
      token,
      password: NEW_PASSWORD,
      passwordConfirmation: NEW_PASSWORD,
    });

    expect(response.status).toBe(410);
    expect(response.body.error).toMatchObject({ code: "INVALID_TOKEN" });
    expect(users.users[0]?.passwordHash).toBe("hashed:old-password");
  });

  it("returns 410 for an unknown token", async () => {
    const response = await resetPassword({
      token: "unknown-token",
      password: NEW_PASSWORD,
      passwordConfirmation: NEW_PASSWORD,
    });

    expect(response.status).toBe(410);
    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: "INVALID_TOKEN",
        message: INVALID_TOKEN_MESSAGE,
      }),
    );
  });

  it("returns 410, not 400, when the token is missing or blank", async () => {
    const missing = await resetPassword({
      password: NEW_PASSWORD,
      passwordConfirmation: NEW_PASSWORD,
    });
    const blank = await resetPassword({
      token: "   ",
      password: NEW_PASSWORD,
      passwordConfirmation: NEW_PASSWORD,
    });

    expect(missing.status).toBe(410);
    expect(missing.body.error).toMatchObject({ code: "INVALID_TOKEN" });
    expect(blank.status).toBe(410);
    expect(blank.body.error).toMatchObject({ code: "INVALID_TOKEN" });
  });

  it("returns 400 with field errors when the password is too short", async () => {
    const user = await createUser("short@example.com");
    const token = await issueToken(user);

    const response = await resetPassword({
      token,
      password: "short",
      passwordConfirmation: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(response.body.error.fields).toEqual([
      expect.objectContaining({ field: "password" }),
    ]);
    expect(users.users[0]?.passwordHash).toBe("hashed:old-password");
  });

  it("returns 400 when the confirmation does not match the password", async () => {
    const user = await createUser("mismatch@example.com");
    const token = await issueToken(user);

    const response = await resetPassword({
      token,
      password: NEW_PASSWORD,
      passwordConfirmation: "different-secret",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toEqual([
      expect.objectContaining({
        field: "passwordConfirmation",
        messages: ["Passwords do not match"],
      }),
    ]);
    expect(users.users[0]?.passwordHash).toBe("hashed:old-password");
    expect(tokens.tokens[0]?.usedAt).toBeNull();
  });

  it("rejects unknown fields", async () => {
    const response = await resetPassword({
      token: "unknown-token",
      password: NEW_PASSWORD,
      passwordConfirmation: NEW_PASSWORD,
      userId: "someone-else",
    });

    expect(response.status).toBe(400);
  });
});
