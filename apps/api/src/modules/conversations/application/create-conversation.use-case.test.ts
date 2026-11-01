import { describe, expect, it, vi } from "vitest";

import { CreateConversationUseCase } from "./create-conversation.use-case";

describe("CreateConversationUseCase", () => {
  it("creates conversation", async () => {
    const repo = { create: vi.fn().mockResolvedValue({ id: "conv1" }) } as any;
    const uc = new CreateConversationUseCase(repo);
    const result = await uc.execute({
      userId: "u1",
      expertKey: "ceo",
      title: "t",
    });
    expect(result).toEqual({ id: "conv1" });
    expect(repo.create).toHaveBeenCalledWith({
      userId: "u1",
      expertKey: "ceo",
      title: "t",
    });
  });
});
