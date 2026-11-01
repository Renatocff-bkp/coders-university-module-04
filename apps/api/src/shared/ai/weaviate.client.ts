import { connectToCustom } from "weaviate-client";

import { getServerEnv } from "../config/env";

let cached: Promise<any> | undefined;

export async function getWeaviateClient(): Promise<any> {
  if (cached) {
    try {
      return await cached;
    } catch (error) {
      cached = undefined;
      throw error;
    }
  }
  const env = getServerEnv();
  const url = new URL(env.WEAVIATE_URL);
  const promise = connectToCustom({
    httpHost: url.hostname,
    httpPort: Number(url.port) || 8080,
    httpSecure: url.protocol === "https:",
    grpcHost: url.hostname,
    grpcPort: 50051,
    grpcSecure: false,
  });
  cached = promise;
  // Clear cache on rejection so callers can retry.
  promise.catch(() => {
    if (cached === promise) cached = undefined;
  });
  return promise;
}

let cachedVectorStore: Promise<any> | undefined;

export async function getVectorStore() {
  if (cachedVectorStore) {
    try {
      return await cachedVectorStore;
    } catch (error) {
      cachedVectorStore = undefined;
      throw error;
    }
  }
  const promise = (async () => {
    const { WeaviateStore } = await import("@langchain/weaviate");
    const { getEmbeddings } = await import("./models.js");
    const client = await getWeaviateClient();
    const embeddings = getEmbeddings();
    return new WeaviateStore(embeddings, {
      client,
      indexName: "ConnectorChunk",
      textKey: "text",
      metadataKeys: ["userId", "connectorId", "sourceName", "chunkIndex"],
    });
  })();
  cachedVectorStore = promise;
  promise.catch(() => {
    if (cachedVectorStore === promise) cachedVectorStore = undefined;
  });
  return promise;
}

export const COLLECTION_NAME = "ConnectorChunk";
