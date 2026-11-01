import { Inject, Injectable } from "@nestjs/common";

import {
  CONVERSATION_REPOSITORY,
  CHAT_MODEL,
  VECTOR_STORE,
} from "../conversations.tokens";
import type { ConversationRepository } from "../domain/conversation-repository";
import type { ChatModel } from "../domain/chat-model";
import type { VectorStore } from "../domain/vector-store";
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
    @Inject(CONVERSATION_REPOSITORY)
    private readonly repo: ConversationRepository,
    private readonly experts: ExpertCatalogService,
    @Inject(CHAT_MODEL) private readonly chatModel: ChatModel,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore,
  ) {}

  private async retrieveContextWithTimeout(
    content: string,
    userId: string,
    timeoutMs: number,
  ): Promise<string> {
    try {
      return await Promise.race([
        this.vectorStore.retrieveContext(content, userId),
        new Promise<string>((resolve) =>
          setTimeout(() => resolve(""), timeoutMs),
        ),
      ]);
    } catch {
      return "";
    }
  }

  async execute(input: ChatStreamInput): Promise<void> {
    let expertKey = input.expertKey;
    if (!expertKey) {
      const conversation = await this.repo.findById(input.conversationId);
      expertKey = (conversation?.expertKey as string) ?? "";
    }

    const expert = this.experts.find(expertKey);
    if (!expert) {
      input.onError(new Error("Unknown expert"));
      return;
    }

    // Persist the user message and retrieve RAG context in parallel: they do
    // not depend on each other, so running them together reduces first-token
    // latency.
    const [, context] = await Promise.all([
      this.repo.addMessage({
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
      }),
      this.retrieveContextWithTimeout(input.content, input.userId, 1500),
    ]);

    const messages = [
      { role: "system", content: expert.systemPrompt + context },
      { role: "user", content: input.content },
    ];

    let fullText = "";
    try {
      const stream = await this.chatModel.stream(messages);
      for await (const token of stream) {
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
