import { Injectable, Logger } from "@nestjs/common";

import { getVectorStore } from "../../../shared/ai/weaviate.client";
import { getServerEnv } from "../../../shared/config/env";

import type { VectorStore, VectorStoreInput } from "../domain/vector-store";

@Injectable()
export class WeaviateVectorStore implements VectorStore {
  private readonly logger = new Logger(WeaviateVectorStore.name);

  async store(
    chunks: Array<{ pageContent: string }>,
    connector: VectorStoreInput,
    userId: string,
  ): Promise<void> {
    if (chunks.length === 0) return;
    try {
      const env = getServerEnv();
      if (!env.OPENAI_API_KEY) return;
      const store = await getVectorStore();
      const withMeta = chunks.map((d, i) => ({
        pageContent: d.pageContent,
        metadata: {
          userId,
          connectorId: connector.id,
          sourceName: connector.name,
          chunkIndex: i,
        },
      }));
      await store.addDocuments(withMeta);
    } catch (error) {
      this.logger.error("embedAndStore failed", error as Error);
    }
  }
}
