import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";

import { CONNECTOR_REPOSITORY } from "../connectors.tokens";
import type { ConnectorRepository } from "../domain/connector-repository";
import { ProcessConnectorUseCase } from "./process-connector.use-case";

@Injectable()
export class CreateConnectorFromUrlUseCase {
  constructor(
    @Inject(CONNECTOR_REPOSITORY) private readonly repo: ConnectorRepository,
    private readonly processor: ProcessConnectorUseCase,
  ) {}

  async execute(input: {
    userId: string;
    url: string;
  }): Promise<{ id: string; status: string; deduplicated: boolean }> {
    const normalized = input.url.trim();
    const sourceHash = createHash("sha256").update(normalized).digest("hex");
    const existing = await this.repo.findByHash(input.userId, sourceHash);
    if (existing) {
      return { id: existing.id, status: existing.status, deduplicated: true };
    }
    const connector = await this.repo.create({
      userId: input.userId,
      type: "url",
      name: normalized,
      sourceHash,
      url: normalized,
    });
    void this.processor.execute({
      connectorId: connector.id,
      userId: input.userId,
    });
    return { id: connector.id, status: connector.status, deduplicated: false };
  }
}
