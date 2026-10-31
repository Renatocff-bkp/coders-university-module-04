import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AuthModule } from "../auth.module";
import {
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_REPOSITORY,
  AUTH_USER_REPOSITORY,
  EMAIL_SERVICE,
  SESSION_TTL_MS,
} from "../auth.tokens";
import { SessionService } from "../application/session.service";
import type { AuthUserRepository } from "../domain/repositories";
import {
  InMemoryAuthSessionRepository,
  InMemoryAuthTokenRepository,
  InMemoryAuthUserRepository,
} from "../testing/in-memory-repositories";
import { FakeEmailService } from "../testing/fake-email.service";
import { HttpExceptionFilter } from "../../../shared/http/http-exception.filter";

describe("Auth session endpoint", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let sessionService: SessionService;
  let userRepository: AuthUserRepository;

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
      .overrideProvider(SESSION_TTL_MS)
      .useValue(7 * 24 * 60 * 60 * 1000)
      .overrideProvider(EMAIL_SERVICE)
      .useClass(FakeEmailService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    sessionService = moduleRef.get(SessionService);
    userRepository = moduleRef.get<AuthUserRepository>(AUTH_USER_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without a bearer token", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("x-request-id", "auth-session-no-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Missing bearer token",
    });
    expect(response.body.error.requestId).toBe("auth-session-no-token");
  });

  it("returns the authenticated user for a valid bearer token", async () => {
    const user = await userRepository.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed-password",
    });
    const { token } = await sessionService.create({ userId: user.id });

    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: user.id,
      email: "ada@example.com",
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("returns 401 for a revoked session", async () => {
    const user = await userRepository.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      passwordHash: "hashed-password",
    });
    const { token } = await sessionService.create({ userId: user.id });
    await sessionService.revoke(token);

    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it("returns 401 for an expired session", async () => {
    const user = await userRepository.create({
      firstName: "Alan",
      lastName: "Turing",
      email: "alan@example.com",
      passwordHash: "hashed-password",
    });
    const { token } = await sessionService.create({ userId: user.id });

    const sessions = moduleRef.get<InMemoryAuthSessionRepository>(
      AUTH_SESSION_REPOSITORY,
    );
    const session = sessions.sessions.at(-1);

    if (session) {
      session.expiresAt = new Date(Date.now() - 1_000);
    }

    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
