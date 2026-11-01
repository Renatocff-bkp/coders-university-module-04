import { describe, expect, it, vi } from "vitest";

import { GetConnectorUseCase } from "./get-connector.use-case";

describe("GetConnectorUseCase", () => {
  it("returns connector by id", async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: "c1" }),
    } as any;
    const uc = new GetConnectorUseCase(repo);
    const result = await uc.execute({ id: "c1" });
    expect(result).toEqual({ id: "c1" });
    expect(repo.findById).toHaveBeenCalledWith("c1");
  });

  it("returns null when not found", async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue(null),
    } as any;
    const uc = new GetConnectorUseCase(repo);
    const result = await uc.execute({ id: "missing" });
    expect(result).toBeNull();
  });
});
