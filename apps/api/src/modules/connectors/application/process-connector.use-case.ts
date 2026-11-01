import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";

import { ConnectorRepository } from "../infrastructure/connector.repository";
import { getWeaviateClient } from "../../../shared/ai/weaviate.client";
// Note: getServerEnv imported from shared/config/env in models; re-export not needed

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

export interface ProcessInput {
  connectorId: string;
  userId: string;
}

@Injectable()
export class ProcessConnectorUseCase {
  constructor(private readonly repo: ConnectorRepository) {}

  async execute(input: ProcessInput): Promise<void> {
    const connector = await this.repo.findById(input.connectorId);
    if (!connector) return;
    if (connector.status === "ready") return;

    await this.repo.updateStatus(connector.id, "processing");
    try {
      const text = await this.extractText(connector);
      const chunks = await this.chunk(text, connector.name);
      await this.embedAndStore(chunks, connector, input.userId);
      await this.repo.updateStatus(connector.id, "ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repo.updateStatus(connector.id, "failed", message);
    }
  }

  private async extractText(connector: {
    type: string;
    content: string | null;
    url: string | null;
    mimeType: string | null;
    name: string;
  }): Promise<string> {
    if (connector.type === "url" && connector.url) {
      const res = await fetch(connector.url);
      const html = await res.text();
      // simple text extraction: strip tags
      return html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    if (connector.content) {
      // content stored as base64 for files
      const buf = Buffer.from(connector.content, "base64");
      const mime = connector.mimeType ?? "";
      if (mime.includes("pdf")) {
        const mod = (await import("pdf-parse")) as {
          default?: (b: Buffer) => Promise<{ text: string }>;
        };
        const pdfParse =
          mod.default ??
          (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
        const data = await pdfParse(buf);
        return data.text;
      }
      return buf.toString("utf-8");
    }
    return "";
  }

  private async chunk(text: string, sourceName: string): Promise<Document[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const docs = await splitter.createDocuments([text], [{ sourceName }]);
    return docs;
  }

  private async embedAndStore(
    docs: Document[],
    connector: { id: string; name: string },
    userId: string,
  ): Promise<void> {
    if (docs.length === 0) return;
    try {
      const env = (
        await import("../../../shared/config/env.js")
      ).getServerEnv();
      if (!env.OPENAI_API_KEY) {
        // skip embedding if no key
        return;
      }
      const { getEmbeddings } = await import("../../../shared/ai/models.js");
      const embeddings = getEmbeddings();
      const client = await getWeaviateClient();
      const { WeaviateStore } = await import("@langchain/weaviate");
      const store = new WeaviateStore(embeddings, {
        client,
        indexName: "ConnectorChunk",
        textKey: "text",
        metadataKeys: ["userId", "connectorId", "sourceName", "chunkIndex"],
      });
      const withMeta = docs.map((d, i) => ({
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
      // best-effort; do not fail connector processing if vector store unavailable
      console.error("embedAndStore failed", error);
    }
  }
}
