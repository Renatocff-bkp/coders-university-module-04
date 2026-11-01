import { describe, expect, it, vi } from "vitest";

import { ListConversationMessagesUseCase } from "./list-conversation-messages.use-case";

describe("ListConversationMessagesUseCase", () => {
  it("lists messages", async () => {
    const repo = {
      listMessages: vi.fn().mockResolvedValue([{ id: "m1" }]),
    } as any;
    const uc = new ListConversationMessagesUseCase(repo);
    const result = await uc.execute({ conversationId: "conv1" });
    expect(result).toEqual([{ id: "m1" }]);
    expect(repo.listMessages).toHaveBeenCalledWith("conv1");
  });
});
