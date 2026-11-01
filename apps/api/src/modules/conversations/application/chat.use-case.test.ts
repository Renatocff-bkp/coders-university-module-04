import { describe, expect, it, vi } from "vitest";

import { ChatUseCase } from "./chat.use-case";
import { ExpertCatalogService } from "../../agents";

describe("ChatUseCase", () => {
  it("errors on unknown expert", async () => {
    const repo = { addMessage: vi.fn(), findById: vi.fn() } as any;
    const uc = new ChatUseCase(repo, new ExpertCatalogService());
    const onError = vi.fn();
    await uc.execute({
      conversationId: "conv1",
      userId: "u1",
      expertKey: "nope",
      content: "hi",
      onToken: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalled();
  });
});
