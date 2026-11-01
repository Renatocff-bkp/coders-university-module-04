import type { INestApplication } from "@nestjs/common";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { HttpExceptionFilter } from "../../../shared/http/http-exception.filter";
import { flattenValidationErrors } from "../../../shared/http/validation";
import { AuthModule } from "../auth.module";
import {
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_REPOSITORY,
  AUTH_USER_REPOSITORY,
  EMAIL_SERVICE,
  PASSWORD_HASHER,
  SESSION_TTL_MS,
} from "../auth.tokens";
import type { PasswordHasher } from "../domain/password-hasher";
import {
  InMemoryAuthSessionRepository,
  InMemoryAuthTokenRepository,
  InMemoryAuthUserRepository,
} from "../testing/in-memory-repositories";
import { FakeEmailService } from "../testing/fake-email.service";
import {
  EMAIL_NOT_CONFIRMED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
} from "./sign-in.handler";

class DeterministicPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

const PASSWORD = "correct-horse";

describe("POST /api/v1/auth/sign-in", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let users: InMemoryAuthUserRepository;
  let sessions: InMemoryAuthSessionRepository;
  let email: FakeEmailService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(AUTH_USER_REPOSITORY)
      .useClass(InMemoryAuthUserRepository)
      .overrideProvider(AUTH_SESSION_REPOSITORY)
      .useClass(InMemoryAuthSessionRepository)
      .overrideProvider(AUTH_TOKEN_REPOSITORY)
      .useClass(InMemoryAuthTokenRepository)
      .overrideProvider(PASSWORD_HASHER)
      .useClass(DeterministicPasswordHasher)
      .overrideProvider(SESSION_TTL_MS)
      .useValue(7 * 24 * 60 * 60 * 1000)
      .overrideProvider(EMAIL_SERVICE)
      .useClass(FakeEmailService)
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

    users = moduleRef.get(AUTH_USER_REPOSITORY);
    sessions = moduleRef.get(AUTH_SESSION_REPOSITORY);
    email = moduleRef.get(EMAIL_SERVICE);
  });

  beforeEach(async () => {
    users.users.length = 0;
    sessions.sessions.length = 0;
    email.sent.length = 0;

    const confirmed = await users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: `hashed:${PASSWORD}`,
    });
    await users.markEmailConfirmed(confirmed.id, new Date());

    await users.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      passwordHash: `hashed:${PASSWORD}`,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 with a generic error for an unknown e-mail and creates no session", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .set("x-request-id", "sign-in-unknown")
      .send({ email: "nobody@example.com", password: PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: INVALID_CREDENTIALS_MESSAGE,
      requestId: "sign-in-unknown",
    });
    expect(sessions.sessions).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("answers the same 401 for a wrong password", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .send({ email: "ada@example.com", password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(response.body.error.message).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(sessions.sessions).toHaveLength(0);
  });

  it("answers 403 EMAIL_NOT_CONFIRMED for the correct password of an unconfirmed account", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .send({ email: "grace@example.com", password: PASSWORD });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({
      code: "EMAIL_NOT_CONFIRMED",
      message: EMAIL_NOT_CONFIRMED_MESSAGE,
    });
    expect(sessions.sessions).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("answers 200 with the token and the public user for valid credentials", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .set("user-agent", "vitest")
      .send({ email: "  ADA@example.com ", password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      email: "ada@example.com",
      emailConfirmedAt: expect.any(String),
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(response.body)).not.toContain("hashed:");
    expect(sessions.sessions).toHaveLength(1);
    expect(sessions.sessions[0]).toMatchObject({ userAgent: "vitest" });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({
      template: "new_session",
      to: "ada@example.com",
      userAgent: "vitest",
    });
  });

  it("revokes the token of the first sign-in when a second sign-in succeeds", async () => {
    const first = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .send({ email: "ada@example.com", password: PASSWORD });
    const second = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .send({ email: "ada@example.com", password: PASSWORD });

    const previous = await request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("Authorization", `Bearer ${first.body.token}`);
    const current = await request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("Authorization", `Bearer ${second.body.token}`);

    expect(previous.status).toBe(401);
    expect(current.status).toBe(200);
  });

  it("answers 400 when the password is missing", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .send({ email: "ada@example.com" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: [{ field: "password" }],
    });
  });

  it("rejects unknown fields", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-in")
      .send({ email: "ada@example.com", password: PASSWORD, role: "admin" });

    expect(response.status).toBe(400);
  });
});
