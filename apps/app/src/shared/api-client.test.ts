import { afterEach, describe, expect, it, vi } from "vitest";

import {
  API_BASE_URL,
  ApiError,
  apiRequest,
  generateRequestId,
  getHealth,
  getPing,
  getSession,
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

  it("clears the token and redirects to sign-in when an authenticated request gets 401", async () => {
    const storage = new Map<string, string>([["auth.token", "token-abc"]]);
    const assign = vi.fn();

    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      location: { assign },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "UNAUTHORIZED",
                message: "Invalid or expired token",
              },
            }),
            { status: 401, headers: { "content-type": "application/json" } },
          ),
      ),
    );

    await expect(getSession("token-abc")).rejects.toMatchObject({
      status: 401,
    });

    expect(storage.has("auth.token")).toBe(false);
    expect(assign).toHaveBeenCalledWith("/auth/sign-in?session=ended");
  });

  it("does not redirect when an anonymous request gets 401", async () => {
    const assign = vi.fn();

    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
      location: { assign },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password.",
              },
            }),
            { status: 401, headers: { "content-type": "application/json" } },
          ),
      ),
    );

    await expect(
      apiRequest("/api/v1/auth/sign-in", {
        method: "POST",
        body: { email: "ada@example.com", password: "wrong" },
      }),
    ).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });

    expect(assign).not.toHaveBeenCalled();
  });

  it("sends the bearer token for the auth session request", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            user: {
              id: "user-1",
              firstName: "Ada",
              lastName: "Lovelace",
              email: "ada@example.com",
              emailConfirmedAt: null,
              createdAt: "2026-10-30T00:00:00.000Z",
              updatedAt: "2026-10-30T00:00:00.000Z",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const session = await getSession("token-abc");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(String(url)).toContain("/api/v1/auth/session");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer token-abc",
    );
    expect(session.user.id).toBe("user-1");
  });
});
