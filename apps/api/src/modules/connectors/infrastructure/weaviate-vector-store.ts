import { Injectable } from "@nestjs/common";

import { getServerEnv } from "../../../shared/config/env";
import { getEmbeddings } from "../../../shared/ai/models";
import { getWeaviateClient } from "../../../shared/ai/weaviate.client";

import type { VectorStore, VectorStoreInput } from "../domain/vector-store";

@Injectable()
export class WeaviateVectorStore implements VectorStore {
  async store(
    chunks: Array<{ pageContent: string }>,
    connector: VectorStoreInput,
    userId: string,
  ): Promise<void> {
    if (chunks.length === 0) return;
    try {
      const env = getServerEnv();
      if (!env.OPENAI_API_KEY) return;
      const embeddings = getEmbeddings();
      const client = await getWeaviateClient();
      const { WeaviateStore } = await import("@langchain/weaviate");
      const store = new WeaviateStore(embeddings, {
        client,
        indexName: "ConnectorChunk",
        textKey: "text",
        metadataKeys: ["userId", "connectorId", "sourceName", "chunkIndex"],
      });
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
      console.error("embedAndStore failed", error);
    }
  }
}
