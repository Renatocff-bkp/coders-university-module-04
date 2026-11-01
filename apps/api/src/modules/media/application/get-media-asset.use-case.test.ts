import { describe, expect, it, vi } from "vitest";

import { GetMediaAssetUseCase } from "./get-media-asset.use-case";

describe("GetMediaAssetUseCase", () => {
  it("returns asset by id", async () => {
    const repo = { findById: vi.fn().mockResolvedValue({ id: "a1" }) } as any;
    const uc = new GetMediaAssetUseCase(repo);
    const result = await uc.execute({ id: "a1" });
    expect(result).toEqual({ id: "a1" });
  });

  it("returns null when not found", async () => {
    const repo = { findById: vi.fn().mockResolvedValue(null) } as any;
    const uc = new GetMediaAssetUseCase(repo);
    const result = await uc.execute({ id: "missing" });
    expect(result).toBeNull();
  });
});
