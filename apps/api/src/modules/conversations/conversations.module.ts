import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AgentsModule } from "../agents/agents.module";
import { ConversationRepository } from "./infrastructure/conversation.repository";
import { ChatUseCase } from "./application/chat.use-case";
import { ConversationsHandler } from "./interface/conversations.handler";

@Module({
  imports: [AuthModule, AgentsModule],
  controllers: [ConversationsHandler],
  providers: [ConversationRepository, ChatUseCase],
})
export class ConversationsModule {}
