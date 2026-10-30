import { afterEach, describe, expect, it, vi } from "vitest";

import {
  API_BASE_URL,
  ApiError,
  generateRequestId,
  getHealth,
  getPing,
  resolveRequestId,
} from "./api-client";

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates safe request ids", () => {
    expect(generateRequestId()).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
  });

  it("reuses valid request ids and rejects unsafe ones", () => {
    expect(resolveRequestId("client-123")).toBe("client-123");
    expect(resolveRequestId("bad id")).not.toBe("bad id");
  });

  it("sends the request id header and returns the response correlation", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: "ok",
            service: "api",
            version: "0.1.0",
            uptimeSeconds: 1,
            timestamp: "2026-10-30T00:00:00.000Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const health = await getHealth();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(String(url)).toContain("/health");
    expect(String(url)).toContain(API_BASE_URL);
    expect(new Headers(init?.headers).get("x-request-id")).toBeTruthy();
    expect(health.status).toBe("ok");
  });

  it("throws an ApiError carrying the server error code", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "NOT_FOUND",
              message: "Unknown route",
              requestId: "abc",
            },
          }),
          { status: 404, headers: { "content-type": "application/json" } },
        ),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(getPing()).rejects.toBeInstanceOf(ApiError);
  });
});
