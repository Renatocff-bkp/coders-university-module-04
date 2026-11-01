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
import { FORGOT_PASSWORD_ACCEPTED_MESSAGE } from "./forgot-password.handler";

class DeterministicPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

async function flushBackgroundWork(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("POST /api/v1/auth/forgot-password", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let users: InMemoryAuthUserRepository;
  let tokens: InMemoryAuthTokenRepository;
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
    tokens = moduleRef.get(AUTH_TOKEN_REPOSITORY);
    email = moduleRef.get(EMAIL_SERVICE);
  });

  beforeEach(async () => {
    users.users.length = 0;
    tokens.tokens.length = 0;
    email.sent.length = 0;

    const confirmed = await users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed:correct-horse",
    });
    confirmed.emailConfirmedAt = new Date();

    await users.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      passwordHash: "hashed:correct-horse",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 202 with the generic message and sends a reset link to a confirmed account", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .set("x-request-id", "forgot-1")
      .send({ email: "  Ada@example.com " });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      message: FORGOT_PASSWORD_ACCEPTED_MESSAGE,
    });
    expect(JSON.stringify(response.body)).not.toContain("token");

    await flushBackgroundWork();

    expect(tokens.tokens).toHaveLength(1);
    expect(tokens.tokens[0]).toMatchObject({ type: "password_reset" });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({
      template: "password_reset",
      to: "ada@example.com",
    });
    expect(email.sent[0]?.token).toBeTruthy();
  });

  it("answers the same 202 for an unknown address and sends nothing", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      message: FORGOT_PASSWORD_ACCEPTED_MESSAGE,
    });

    await flushBackgroundWork();

    expect(tokens.tokens).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("answers the same 202 for an unconfirmed account and sends nothing", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "grace@example.com" });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      message: FORGOT_PASSWORD_ACCEPTED_MESSAGE,
    });

    await flushBackgroundWork();

    expect(tokens.tokens).toHaveLength(0);
    expect(email.sent).toHaveLength(0);
  });

  it("returns 400 for a malformed e-mail", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .set("x-request-id", "forgot-invalid")
      .send({ email: "ada@example" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: [
        {
          field: "email",
          messages: ["Enter a valid email address"],
        },
      ],
      requestId: "forgot-invalid",
    });
  });

  it("rejects unknown fields", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "ada@example.com", role: "admin" });

    expect(response.status).toBe(400);
  });
});
