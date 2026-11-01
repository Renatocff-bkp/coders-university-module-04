import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";

import { ConnectorRepository } from "../infrastructure/connector.repository";
import { ProcessConnectorUseCase } from "./process-connector.use-case";

@Injectable()
export class CreateConnectorFromFileUseCase {
  constructor(
    private readonly repo: ConnectorRepository,
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

@Injectable()
export class CreateConnectorFromUrlUseCase {
  constructor(
    private readonly repo: ConnectorRepository,
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
