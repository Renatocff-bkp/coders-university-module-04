import { Inject, Injectable } from "@nestjs/common";

import { CONVERSATION_REPOSITORY } from "../conversations.tokens";
import type { ConversationRepository } from "../domain/conversation-repository";

@Injectable()
export class CreateConversationUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly repo: ConversationRepository,
  ) {}

  async execute(input: {
    userId: string;
    expertKey: string;
    title?: string | null;
  }) {
    return this.repo.create({
      userId: input.userId,
      expertKey: input.expertKey,
      title: input.title ?? null,
    });
  }
}
