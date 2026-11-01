import { Injectable } from "@nestjs/common";

import { getEmbeddings } from "../../../shared/ai/models";
import { getWeaviateClient } from "../../../shared/ai/weaviate.client";

import type { VectorStore } from "../domain/vector-store";

@Injectable()
export class WeaviateVectorStore implements VectorStore {
  async retrieveContext(query: string, userId: string): Promise<string> {
    try {
      const { WeaviateStore } = await import("@langchain/weaviate");
      const embeddings = getEmbeddings();
      const client = await getWeaviateClient();
      const store = new WeaviateStore(embeddings, {
        client,
        indexName: "ConnectorChunk",
        textKey: "text",
        metadataKeys: ["userId", "connectorId", "sourceName", "chunkIndex"],
      });
      const results = await store.similaritySearch(query, 8);
      const filtered = results
        .filter((r) => r.metadata?.userId === userId)
        .slice(0, 4);
      if (filtered.length === 0) return "";
      return (
        "\n\nRelevant context from connected data:\n" +
        filtered.map((r) => `- ${r.pageContent}`).join("\n")
      );
    } catch {
      return "";
    }
  }
}
