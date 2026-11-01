import { Injectable } from "@nestjs/common";

import { getChatModel } from "../../../shared/ai/models";

import type { ChatModel } from "../domain/chat-model";

@Injectable()
export class LangChainChatModel implements ChatModel {
  async stream(messages: Array<{ role: string; content: string }>) {
    const model = getChatModel();
    const stream = await model.stream(messages as never);

    async function* generate() {
      for await (const chunk of stream) {
        const token = typeof chunk.content === "string" ? chunk.content : "";
        if (token) yield token;
      }
    }

    return generate();
  }
}
