import type { INestApplication } from "@nestjs/common";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { HttpExceptionFilter } from "../../../shared/http/http-exception.filter";
import { flattenValidationErrors } from "../../../shared/http/validation";
import { ConfirmAccountUseCase } from "../application/confirm-account.use-case";
import { OneTimeTokenService } from "../application/one-time-token.service";
import { AuthModule } from "../auth.module";
import {
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_REPOSITORY,
  AUTH_USER_REPOSITORY,
  CLOCK,
  EMAIL_SERVICE,
  SESSION_TTL_MS,
  TRANSACTION_MANAGER,
} from "../auth.tokens";
import { EMAIL_CONFIRMATION_TTL_MS } from "../domain/auth-token";
import type { AuthUser } from "../domain/auth-user";
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

describe("POST /api/v1/auth/confirm-account", () => {
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
      passwordHash: "hashed:correct-horse",
    });
  }

  async function issueToken(
    user: AuthUser,
    type: "email_confirmation" | "password_reset" = "email_confirmation",
  ): Promise<string> {
    const issued = await oneTimeTokens.issue(
      user.id,
      type,
      EMAIL_CONFIRMATION_TTL_MS,
    );

    return issued.token;
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

    expect(moduleRef.get(ConfirmAccountUseCase)).toBeInstanceOf(
      ConfirmAccountUseCase,
    );
    oneTimeTokens = moduleRef.get(OneTimeTokenService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 200 with the session token and the confirmed user", async () => {
    const user = await createUser("ada@example.com");
    const token = await issueToken(user);
    email.sent.length = 0;

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/confirm-account")
      .set("x-request-id", "confirm-1")
      .set("user-agent", "vitest")
      .send({ token });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      id: user.id,
      email: "ada@example.com",
      emailConfirmedAt: NOW.toISOString(),
    });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(users.users[0]?.emailConfirmedAt).toEqual(NOW);
    expect(tokens.tokens[0]?.usedAt).toEqual(NOW);
    expect(sessions.sessions).toHaveLength(1);
    expect(sessions.sessions[0]).toMatchObject({
      userId: user.id,
      userAgent: "vitest",
      revokedAt: null,
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

  it("returns the same 410 for a token that was already used", async () => {
    const user = await createUser("grace@example.com");
    const token = await issueToken(user);

    await request(app.getHttpServer())
      .post("/api/v1/auth/confirm-account")
      .send({ token });

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/confirm-account")
      .set("x-request-id", "confirm-reused")
      .send({ token });

    expect(response.status).toBe(410);
    expect(response.body.error).toMatchObject({
      code: "INVALID_TOKEN",
      message: INVALID_TOKEN_MESSAGE,
      requestId: "confirm-reused",
    });
    expect(JSON.stringify(response.body)).not.toContain(token);
    expect(sessions.sessions.filter((s) => s.userId === user.id)).toHaveLength(
      1,
    );
  });

  it("returns 410 for an expired token without confirming the account", async () => {
    const user = await createUser("expired@example.com");
    const token = await issueToken(user);

    clock.advance(EMAIL_CONFIRMATION_TTL_MS);

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/confirm-account")
      .send({ token });

    expect(response.status).toBe(410);
    expect(response.body.error).toMatchObject({ code: "INVALID_TOKEN" });
    expect(
      users.users.find((u) => u.id === user.id)?.emailConfirmedAt,
    ).toBeNull();
    expect(sessions.sessions.filter((s) => s.userId === user.id)).toHaveLength(
      0,
    );
  });

  it("returns 410 for a token of another type", async () => {
    const user = await createUser("other-type@example.com");
    const token = await issueToken(user, "password_reset");

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/confirm-account")
      .send({ token });

    expect(response.status).toBe(410);
    expect(response.body.error).toMatchObject({ code: "INVALID_TOKEN" });
    expect(
      users.users.find((u) => u.id === user.id)?.emailConfirmedAt,
    ).toBeNull();
  });

  it("returns 410 for an unknown token", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/confirm-account")
      .send({ token: "unknown-token" });

    expect(response.status).toBe(410);
    expect(response.body.error).toEqual(
      expect.objectContaining({
        code: "INVALID_TOKEN",
        message: INVALID_TOKEN_MESSAGE,
      }),
    );
  });

  it("returns 400 when the token is missing or blank", async () => {
    const missing = await request(app.getHttpServer())
      .post("/api/v1/auth/confirm-account")
      .send({});
    const blank = await request(app.getHttpServer())
      .post("/api/v1/auth/confirm-account")
      .send({ token: "   " });

    expect(missing.status).toBe(400);
    expect(missing.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(blank.status).toBe(400);
    expect(blank.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects unknown fields", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/confirm-account")
      .send({ token: "unknown-token", userId: "someone-else" });

    expect(response.status).toBe(400);
  });
});
