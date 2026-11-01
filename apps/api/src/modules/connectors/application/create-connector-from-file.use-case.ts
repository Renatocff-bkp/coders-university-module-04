import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";

import { CONNECTOR_REPOSITORY } from "../connectors.tokens";
import type { ConnectorRepository } from "../domain/connector-repository";
import { ProcessConnectorUseCase } from "./process-connector.use-case";

@Injectable()
export class CreateConnectorFromFileUseCase {
  constructor(
    @Inject(CONNECTOR_REPOSITORY) private readonly repo: ConnectorRepository,
    private readonly processor: ProcessConnectorUseCase,
  ) {}

  async execute(input: {
    userId: string;
    file: { originalname: string; mimetype: string; buffer: Buffer };
  }): Promise<{ id: string; status: string; deduplicated: boolean }> {
    const sourceHash = createHash("sha256")
      .update(input.file.buffer)
      .digest("hex");
    const existing = await this.repo.findByHash(input.userId, sourceHash);
    if (existing) {
      return { id: existing.id, status: existing.status, deduplicated: true };
    }
    const connector = await this.repo.create({
      userId: input.userId,
      type: "file",
      name: input.file.originalname,
      sourceHash,
      mimeType: input.file.mimetype,
      sizeBytes: input.file.buffer.length,
      content: input.file.buffer.toString("base64"),
    });
    void this.processor.execute({
      connectorId: connector.id,
      userId: input.userId,
    });
    return { id: connector.id, status: connector.status, deduplicated: false };
  }
}
