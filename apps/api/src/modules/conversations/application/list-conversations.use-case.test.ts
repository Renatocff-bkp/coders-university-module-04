import { describe, expect, it, vi } from "vitest";

import { ListConversationsUseCase } from "./list-conversations.use-case";

describe("ListConversationsUseCase", () => {
  it("lists conversations", async () => {
    const repo = {
      listByUser: vi.fn().mockResolvedValue([{ id: "conv1" }]),
    } as any;
    const uc = new ListConversationsUseCase(repo);
    const result = await uc.execute({ userId: "u1" });
    expect(result).toEqual([{ id: "conv1" }]);
    expect(repo.listByUser).toHaveBeenCalledWith("u1", undefined);
  });
});
