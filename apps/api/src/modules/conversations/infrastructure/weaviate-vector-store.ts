import { Injectable } from "@nestjs/common";

import {
  getVectorStore,
  getWeaviateClient,
} from "../../../shared/ai/weaviate.client";
import { getServerEnv } from "../../../shared/config/env";

import type { VectorStore } from "../domain/vector-store";

@Injectable()
export class WeaviateVectorStore implements VectorStore {
  async retrieveContext(query: string, userId: string): Promise<string> {
    try {
      const env = getServerEnv();
      if (!env.OPENAI_API_KEY) return "";
      const store = await getVectorStore();
      const client = await getWeaviateClient();
      const collection = client.collections.get("ConnectorChunk");
      const filter = collection.filter.byProperty("userId").equal(userId);
      const results = await store.similaritySearch(query, 8, filter);
      const filtered = results.slice(0, 4);
      if (filtered.length === 0) return "";
      return (
        "\n\nRelevant context from connected data:\n" +
        filtered.map((r: any) => `- ${r.pageContent}`).join("\n")
      );
    } catch {
      return "";
    }
  }
}
