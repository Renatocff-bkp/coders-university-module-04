import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ConversationsModule } from "../conversations.module";
import {
  CONVERSATION_REPOSITORY,
  CHAT_MODEL,
  VECTOR_STORE,
} from "../conversations.tokens";
import {
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_REPOSITORY,
  AUTH_USER_REPOSITORY,
  EMAIL_SERVICE,
  SESSION_TTL_MS,
} from "../../auth/auth.tokens";
import { SessionService } from "../../auth/application/session.service";
import type { AuthUserRepository } from "../../auth/domain/repositories";
import {
  InMemoryAuthSessionRepository,
  InMemoryAuthTokenRepository,
  InMemoryAuthUserRepository,
} from "../../auth/testing/in-memory-repositories";
import { FakeEmailService } from "../../auth/testing/fake-email.service";
import { HttpExceptionFilter } from "../../../shared/http/http-exception.filter";

describe("Send message endpoint", () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const fakeRepo = {
      create: vi.fn(),
      listByUser: vi.fn(),
      findById: vi.fn().mockResolvedValue({ id: "conv1", expertKey: "ceo" }),
      addMessage: vi.fn().mockResolvedValue({ id: "m1" }),
      listMessages: vi.fn(),
    };

    const fakeChatModel = {
      stream: vi.fn().mockImplementation(async function* () {
        yield "hi";
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ConversationsModule],
    })
      .overrideProvider(CONVERSATION_REPOSITORY)
      .useValue(fakeRepo)
      .overrideProvider(CHAT_MODEL)
      .useValue(fakeChatModel)
      .overrideProvider(VECTOR_STORE)
      .useValue({ retrieveContext: vi.fn().mockResolvedValue("") })
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

    const sessionService = moduleRef.get(SessionService);
    const userRepository =
      moduleRef.get<AuthUserRepository>(AUTH_USER_REPOSITORY);
    const user = await userRepository.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed-password",
    });
    const issued = await sessionService.create({ userId: user.id });
    token = issued.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("streams a response", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/conversations/conv1/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "hello", expertKey: "ceo" });

    expect([200, 201]).toContain(response.status);
    expect(response.text).toContain("data:");
  });
});
