import { Injectable } from "@nestjs/common";

import { getChatModel, getEmbeddings } from "../../../shared/ai/models";
import { getWeaviateClient } from "../../../shared/ai/weaviate.client";
import { ConversationRepository } from "../infrastructure/conversation.repository";
import { ExpertCatalogService } from "../../agents";

export interface ChatStreamInput {
  conversationId: string;
  userId: string;
  expertKey: string;
  content: string;
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

@Injectable()
export class ChatUseCase {
  constructor(
    private readonly repo: ConversationRepository,
    private readonly experts: ExpertCatalogService,
  ) {}

  async execute(input: ChatStreamInput): Promise<void> {
    const expert = this.experts.find(input.expertKey);
    if (!expert) {
      input.onError(new Error("Unknown expert"));
      return;
    }

    // persist user message
    await this.repo.addMessage({
      conversationId: input.conversationId,
      role: "user",
      content: input.content,
    });

    // RAG retrieval (best-effort)
    let context = "";
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
      const results = await store.similaritySearch(input.content, 8);
      const filtered = results
        .filter((r) => r.metadata?.userId === input.userId)
        .slice(0, 4);
      if (filtered.length > 0) {
        context =
          "\n\nRelevant context from connected data:\n" +
          filtered.map((r) => `- ${r.pageContent}`).join("\n");
      }
    } catch {
      // ignore retrieval errors
    }

    const model = getChatModel();
    const messages = [
      { role: "system", content: expert.systemPrompt + context },
      { role: "user", content: input.content },
    ];

    let fullText = "";
    try {
      const stream = await model.stream(messages as never);
      for await (const chunk of stream) {
        const token = typeof chunk.content === "string" ? chunk.content : "";
        if (token) {
          fullText += token;
          input.onToken(token);
        }
      }
      await this.repo.addMessage({
        conversationId: input.conversationId,
        role: "assistant",
        content: fullText,
      });
      input.onDone(fullText);
    } catch (error) {
      input.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
