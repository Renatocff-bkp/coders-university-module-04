import { describe, expect, it, vi } from "vitest";

import { CreateConnectorFromFileUseCase } from "./create-connector-from-file.use-case";
import { CreateConnectorFromUrlUseCase } from "./create-connector-from-url.use-case";

describe("CreateConnectorFromFileUseCase", () => {
  it("deduplicates when hash exists", async () => {
    const repo = {
      findByHash: vi
        .fn()
        .mockResolvedValue({ id: "existing", status: "ready" }),
      create: vi.fn(),
      findById: vi.fn(),
      listByUser: vi.fn(),
      updateStatus: vi.fn(),
      updateContent: vi.fn(),
    } as any;
    const processor = { execute: vi.fn() } as any;
    const uc = new CreateConnectorFromFileUseCase(repo, processor);
    const result = await uc.execute({
      userId: "u1",
      file: {
        originalname: "a.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from("x"),
      },
    });
    expect(result.deduplicated).toBe(true);
    expect(result.id).toBe("existing");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("creates new connector and triggers processing", async () => {
    const repo = {
      findByHash: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "new", status: "pending" }),
    } as any;
    const processor = { execute: vi.fn().mockResolvedValue(undefined) } as any;
    const uc = new CreateConnectorFromFileUseCase(repo, processor);
    const result = await uc.execute({
      userId: "u1",
      file: {
        originalname: "a.txt",
        mimetype: "text/plain",
        buffer: Buffer.from("hello"),
      },
    });
    expect(result.deduplicated).toBe(false);
    expect(result.id).toBe("new");
    expect(repo.create).toHaveBeenCalled();
  });
});

describe("CreateConnectorFromUrlUseCase", () => {
  it("deduplicates url", async () => {
    const repo = {
      findByHash: vi
        .fn()
        .mockResolvedValue({ id: "existing", status: "ready" }),
      create: vi.fn(),
    } as any;
    const processor = { execute: vi.fn() } as any;
    const uc = new CreateConnectorFromUrlUseCase(repo, processor);
    const result = await uc.execute({
      userId: "u1",
      url: "https://example.com",
    });
    expect(result.deduplicated).toBe(true);
  });
});
