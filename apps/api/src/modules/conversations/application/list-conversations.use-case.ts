import { Inject, Injectable } from "@nestjs/common";

import { CONVERSATION_REPOSITORY } from "../conversations.tokens";
import type { ConversationRepository } from "../domain/conversation-repository";

@Injectable()
export class ListConversationsUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly repo: ConversationRepository,
  ) {}

  async execute(input: { userId: string; expertKey?: string }) {
    return this.repo.listByUser(input.userId, input.expertKey);
  }
}
