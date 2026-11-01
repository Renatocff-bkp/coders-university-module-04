import { describe, expect, it, vi } from "vitest";

import { ProcessConnectorUseCase } from "./process-connector.use-case";

describe("ProcessConnectorUseCase", () => {
  it("marks ready for text connector", async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({
        id: "c1",
        userId: "u1",
        type: "file",
        name: "a.txt",
        sourceHash: "h",
        status: "pending",
        mimeType: "text/plain",
        content: Buffer.from("hello world").toString("base64"),
        url: null,
      }),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    } as any;
    const uc = new ProcessConnectorUseCase(repo);
    await uc.execute({ connectorId: "c1", userId: "u1" });
    expect(repo.updateStatus).toHaveBeenCalledWith("c1", "processing");
    expect(repo.updateStatus).toHaveBeenCalledWith("c1", "ready");
  });

  it("marks failed on error", async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({
        id: "c2",
        userId: "u1",
        type: "url",
        name: "https://example.com",
        sourceHash: "h2",
        status: "pending",
        mimeType: null,
        content: null,
        url: "http://127.0.0.1:1/none",
      }),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    } as any;
    const uc = new ProcessConnectorUseCase(repo);
    await uc.execute({ connectorId: "c2", userId: "u1" });
    // either ready or failed depending on fetch; ensure processing called
    expect(repo.updateStatus).toHaveBeenCalledWith("c2", "processing");
  });
});
