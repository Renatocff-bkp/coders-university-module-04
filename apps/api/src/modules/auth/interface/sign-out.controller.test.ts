import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { HttpExceptionFilter } from "../../../shared/http/http-exception.filter";
import { SessionService } from "../application/session.service";
import { AuthModule } from "../auth.module";
import {
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_REPOSITORY,
  AUTH_USER_REPOSITORY,
  EMAIL_SERVICE,
  SESSION_TTL_MS,
} from "../auth.tokens";
import {
  InMemoryAuthSessionRepository,
  InMemoryAuthTokenRepository,
  InMemoryAuthUserRepository,
} from "../testing/in-memory-repositories";
import { FakeEmailService } from "../testing/fake-email.service";

describe("POST /api/v1/auth/sign-out", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let sessionService: SessionService;
  let users: InMemoryAuthUserRepository;

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
    users = moduleRef.get(AUTH_USER_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without a bearer token", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-out")
      .set("x-request-id", "sign-out-no-token");

    expect(response.status).toBe(401);
    expect(response.body.error.requestId).toBe("sign-out-no-token");
  });

  it("answers 204 and revokes the session on the server", async () => {
    const user = await users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada.signout@example.com",
      passwordHash: "hashed-password",
    });
    const { token } = await sessionService.create({ userId: user.id });

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-out")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");

    const session = await request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("Authorization", `Bearer ${token}`);

    expect(session.status).toBe(401);
  });

  it("answers 401 when the same token signs out twice", async () => {
    const user = await users.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace.signout@example.com",
      passwordHash: "hashed-password",
    });
    const { token } = await sessionService.create({ userId: user.id });

    await request(app.getHttpServer())
      .post("/api/v1/auth/sign-out")
      .set("Authorization", `Bearer ${token}`);

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/sign-out")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
