import { describe, expect, it } from "vitest";

import { GetPingUseCase } from "./get-ping.use-case";

describe("GetPingUseCase", () => {
  it("returns pong correlated with the request id", () => {
    const result = new GetPingUseCase().execute("request-123");

    expect(result).toEqual({
      message: "pong",
      requestId: "request-123",
    });
  });
});
