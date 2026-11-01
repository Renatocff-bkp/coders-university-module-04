import type { INestApplication } from "@nestjs/common";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { HttpExceptionFilter } from "../../../shared/http/http-exception.filter";
import { flattenValidationErrors } from "../../../shared/http/validation";
import { SignUpUseCase } from "../application/sign-up.use-case";
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
import type { AuthUserRepository } from "../domain/repositories";
import {
  InMemoryAuthSessionRepository,
  InMemoryAuthTokenRepository,
  InMemoryAuthUserRepository,
} from "../testing/in-memory-repositories";
import { FakeEmailService } from "../testing/fake-email.service";
import { SIGN_UP_ACCEPTED_MESSAGE } from "./sign-up.handler";

class DeterministicPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

const VALID_PAYLOAD = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "correct-horse",
  passwordConfirmation: "correct-horse",
};

describe("POST /api/v1/auth/sign-up", () => {
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

    expect(moduleRef.get(SignUpUseCase)).toBeInstanceOf(SignUpUseCase);
    users = moduleRef.get(AUTH_USER_REPOSITORY);
    sessions = moduleRef.get(AUTH_SESSION_REPOSITORY);
    email = moduleRef.get(EMAIL_SERVICE);
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 202 with a generic message and creates no session", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-up")
      .set("x-request-id", "sign-up-1")
      .send(VALID_PAYLOAD);

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ message: SIGN_UP_ACCEPTED_MESSAGE });
    expect(JSON.stringify(response.body)).not.toContain("hashed:");
    expect(JSON.stringify(response.body)).not.toContain("token");
    expect(users.users).toHaveLength(1);
    expect(users.users[0]).toMatchObject({
      email: "ada@example.com",
      emailConfirmedAt: null,
      passwordHash: "hashed:correct-horse",
    });
    expect(sessions.sessions).toHaveLength(0);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({
      template: "email_confirmation",
      to: "ada@example.com",
    });
    expect(email.sent[0]?.token).toBeTruthy();
  });

  it("returns the same 202 for an already registered e-mail without duplicating it", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-up")
      .send({ ...VALID_PAYLOAD, email: "ADA@example.com" });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ message: SIGN_UP_ACCEPTED_MESSAGE });
    expect(users.users).toHaveLength(1);
    expect(email.sent).toHaveLength(2);
  });

  it("returns 400 when password and confirmation diverge", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-up")
      .set("x-request-id", "sign-up-mismatch")
      .send({ ...VALID_PAYLOAD, passwordConfirmation: "different-password" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: [
        { field: "passwordConfirmation", messages: ["Passwords do not match"] },
      ],
    });
    expect(response.body.error.requestId).toBe("sign-up-mismatch");
  });

  it("rejects unknown fields", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-up")
      .send({ ...VALID_PAYLOAD, role: "admin" });

    expect(response.status).toBe(400);
  });

  it("does not send a confirmation e-mail for an already confirmed account", async () => {
    const created = await users.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      passwordHash: "hashed:correct-horse",
    });
    created.emailConfirmedAt = new Date();
    email.sent.length = 0;

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-up")
      .send({
        ...VALID_PAYLOAD,
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace@example.com",
      });

    expect(response.status).toBe(202);
    expect(email.sent).toHaveLength(0);
  });
});
