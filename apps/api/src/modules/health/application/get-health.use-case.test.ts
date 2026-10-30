import { describe, expect, it } from "vitest";

import { GetHealthUseCase } from "./get-health.use-case";

describe("GetHealthUseCase", () => {
  const useCase = new GetHealthUseCase({
    name: "api",
    version: "0.1.0",
  });

  it("reports the service as healthy", () => {
    const result = useCase.execute(new Date("2026-10-29T12:00:00.000Z"));

    expect(result).toEqual({
      status: "ok",
      service: "api",
      version: "0.1.0",
      uptimeSeconds: expect.any(Number),
      timestamp: "2026-10-29T12:00:00.000Z",
    });
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
