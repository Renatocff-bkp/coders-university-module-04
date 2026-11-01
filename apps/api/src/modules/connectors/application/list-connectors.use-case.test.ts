import { describe, expect, it, vi } from "vitest";

import { ListConnectorsUseCase } from "./list-connectors.use-case";

describe("ListConnectorsUseCase", () => {
  it("returns connectors for user", async () => {
    const repo = {
      listByUser: vi.fn().mockResolvedValue([{ id: "c1" }]),
    } as any;
    const uc = new ListConnectorsUseCase(repo);
    const result = await uc.execute({ userId: "u1" });
    expect(result).toEqual([{ id: "c1" }]);
    expect(repo.listByUser).toHaveBeenCalledWith("u1");
  });
});
