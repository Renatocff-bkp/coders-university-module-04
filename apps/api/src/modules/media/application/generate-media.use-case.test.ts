import { describe, expect, it, vi } from "vitest";

import { GenerateMediaUseCase } from "./generate-media.use-case";

describe("GenerateMediaUseCase", () => {
  it("throws when no api key for image", async () => {
    const repo = { create: vi.fn() } as any;
    const uc = new GenerateMediaUseCase(repo, {
      generate: vi
        .fn()
        .mockRejectedValue(new Error("OPENAI_API_KEY not configured")),
    } as any);
    await expect(
      uc.generateImage({ userId: "u1", prompt: "a cat" }),
    ).rejects.toThrow();
  });

  it("video generation not implemented", async () => {
    const repo = { create: vi.fn() } as any;
    const uc = new GenerateMediaUseCase(repo, {
      generate: vi
        .fn()
        .mockRejectedValue(new Error("OPENAI_API_KEY not configured")),
    } as any);
    await expect(
      uc.generateVideo({ userId: "u1", prompt: "a video" }),
    ).rejects.toThrow();
  });

  it("execute dispatches by type", async () => {
    const repo = { create: vi.fn() } as any;
    const uc = new GenerateMediaUseCase(repo, {
      generate: vi
        .fn()
        .mockRejectedValue(new Error("OPENAI_API_KEY not configured")),
    } as any);
    await expect(
      uc.execute({ userId: "u1", type: "image", prompt: "a cat" }),
    ).rejects.toThrow();
    await expect(
      uc.execute({ userId: "u1", type: "video", prompt: "a video" }),
    ).rejects.toThrow();
  });
});
