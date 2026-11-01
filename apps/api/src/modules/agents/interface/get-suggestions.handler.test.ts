import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AgentsModule } from "../agents.module";
import { HttpExceptionFilter } from "../../../shared/http/http-exception.filter";

describe("Get suggestions endpoint", () => {
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

  it("returns suggestions for an expert", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/experts/ceo/suggestions",
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.suggestions)).toBe(true);
    expect(response.body.suggestions.length).toBeGreaterThan(0);
  });

  it("returns empty suggestions for unknown expert", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/experts/nope/suggestions",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ suggestions: [] });
  });
});
