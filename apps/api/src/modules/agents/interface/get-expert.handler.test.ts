import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AgentsModule } from "../agents.module";
import { HttpExceptionFilter } from "../../../shared/http/http-exception.filter";

describe("Get expert endpoint", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AgentsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns an expert by key", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/experts/cto",
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ key: "cto" });
  });

  it("returns not-found payload for unknown expert", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/experts/nope",
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      error: { code: "NOT_FOUND", message: "Expert not found" },
    });
  });
});
