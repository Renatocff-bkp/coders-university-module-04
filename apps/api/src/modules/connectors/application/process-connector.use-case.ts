import { Inject, Injectable } from "@nestjs/common";

import {
  CONNECTOR_REPOSITORY,
  TEXT_EXTRACTOR,
  CHUNKER,
  VECTOR_STORE,
  ENVIRONMENT,
} from "../connectors.tokens";
import type { ConnectorRepository } from "../domain/connector-repository";
import type { TextExtractor } from "../domain/text-extractor";
import type { Chunker } from "../domain/chunker";
import type { VectorStore } from "../domain/vector-store";
import type { Environment } from "../domain/environment";

export interface ProcessInput {
  connectorId: string;
  userId: string;
}

@Injectable()
export class ProcessConnectorUseCase {
  constructor(
    @Inject(CONNECTOR_REPOSITORY) private readonly repo: ConnectorRepository,
    @Inject(TEXT_EXTRACTOR) private readonly textExtractor: TextExtractor,
    @Inject(CHUNKER) private readonly chunker: Chunker,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  async execute(input: ProcessInput): Promise<void> {
    const connector = await this.repo.findById(input.connectorId);
    if (!connector) return;
    if (connector.status === "ready") return;

    await this.repo.updateStatus(connector.id, "processing");
    try {
      const text = await this.textExtractor.extract({
        type: connector.type,
        content: connector.content,
        url: connector.url,
        mimeType: connector.mimeType,
        name: connector.name,
      });
      const chunks = await this.chunker.chunk(text, connector.name);
      if (this.env.getOpenAiApiKey()) {
        await this.vectorStore.store(
          chunks,
          { id: connector.id, name: connector.name },
          input.userId,
        );
      }
      await this.repo.updateStatus(connector.id, "ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repo.updateStatus(connector.id, "failed", message);
    }
  }
}
