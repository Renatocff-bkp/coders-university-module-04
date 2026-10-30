import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "./app";
import { clearTestLogs, readTestLogs } from "./shared/logging/test-sink";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function waitForLog(
  predicate: (entry: Record<string, unknown>) => boolean,
): Promise<Record<string, unknown> | undefined> {
  const deadline = Date.now() + 1_000;

  while (Date.now() < deadline) {
    const match = readTestLogs().find(predicate);

    if (match) {
      return match;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return undefined;
}

describe("API HTTP contract", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("responds to GET /health outside the API prefix", async () => {
    const response = await request(app.getHttpServer()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "api",
      version: "0.1.0",
    });
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("responds to GET /api/v1/ping", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/ping");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: "pong",
      requestId: response.headers["x-request-id"],
    });
  });

  it("echoes a valid x-request-id", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/ping")
      .set("x-request-id", "client-request-123");

    expect(response.headers["x-request-id"]).toBe("client-request-123");
    expect(response.body.requestId).toBe("client-request-123");
  });

  it("replaces an unsafe x-request-id", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/ping")
      .set("x-request-id", "bad id with spaces");

    expect(response.headers["x-request-id"]).toMatch(UUID_PATTERN);
    expect(response.headers["x-request-id"]).not.toBe("bad id with spaces");
  });

  it("writes the request id into the log context", async () => {
    clearTestLogs();

    const requestId = "correlation-log-123";
    const response = await request(app.getHttpServer())
      .get("/api/v1/ping")
      .set("x-request-id", requestId);

    expect(response.headers["x-request-id"]).toBe(requestId);

    const entry = await waitForLog((log) => log.requestId === requestId);

    expect(entry).toBeDefined();
    expect(entry?.req).toMatchObject({
      method: "GET",
      url: "/api/v1/ping",
    });
  });

  it("returns 400 with field errors and no stack trace", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/ping")
      .query({ name: "a".repeat(41) });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      fields: [{ field: "name" }],
    });
    expect(response.body.error.requestId).toBe(
      response.headers["x-request-id"],
    );
    expect(JSON.stringify(response.body)).not.toContain("stack");
  });

  it("returns a standardised 404 with request id", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/unknown");

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(response.body.error.requestId).toBe(
      response.headers["x-request-id"],
    );
  });

  it("exposes the request id header through CORS", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "http://localhost:3000");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(response.headers["access-control-expose-headers"]).toContain(
      "x-request-id",
    );
  });
});
