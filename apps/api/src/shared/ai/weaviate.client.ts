import { connectToCustom } from "weaviate-client";

import { getServerEnv } from "../config/env";

let cached: Promise<any> | undefined;

export async function getWeaviateClient(): Promise<any> {
  if (cached) return cached;
  const env = getServerEnv();
  const url = new URL(env.WEAVIATE_URL);
  cached = connectToCustom({
    httpHost: url.hostname,
    httpPort: Number(url.port) || 8080,
    httpSecure: url.protocol === "https:",
    grpcHost: url.hostname,
    grpcPort: 50051,
    grpcSecure: false,
  });
  return cached;
}

export async function getVectorStore() {
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
}

export const COLLECTION_NAME = "ConnectorChunk";
