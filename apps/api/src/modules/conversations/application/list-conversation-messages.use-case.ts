import { Inject, Injectable } from "@nestjs/common";

import { CONVERSATION_REPOSITORY } from "../conversations.tokens";
import type { ConversationRepository } from "../domain/conversation-repository";

@Injectable()
export class ListConversationMessagesUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly repo: ConversationRepository,
  ) {}

  async execute(input: { conversationId: string }) {
    return this.repo.listMessages(input.conversationId);
  }
}
