import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AgentsModule } from "../agents/agents.module";
import {
  CONVERSATION_REPOSITORY,
  CHAT_MODEL,
  VECTOR_STORE,
} from "./conversations.tokens";
import { ConversationRepository } from "./infrastructure/conversation.repository";
import { LangChainChatModel } from "./infrastructure/langchain-chat-model";
import { WeaviateVectorStore } from "./infrastructure/weaviate-vector-store";
import { ChatUseCase } from "./application/chat.use-case";
import { CreateConversationUseCase } from "./application/create-conversation.use-case";
import { ListConversationsUseCase } from "./application/list-conversations.use-case";
import { ListConversationMessagesUseCase } from "./application/list-conversation-messages.use-case";
import { CreateConversationHandler } from "./interface/create-conversation.handler";
import { ListConversationsHandler } from "./interface/list-conversations.handler";
import { ListConversationMessagesHandler } from "./interface/list-conversation-messages.handler";
import { SendMessageHandler } from "./interface/send-message.handler";

@Module({
  imports: [AuthModule, AgentsModule],
  controllers: [
    CreateConversationHandler,
    ListConversationsHandler,
    ListConversationMessagesHandler,
    SendMessageHandler,
  ],
  providers: [
    ConversationRepository,
    { provide: CONVERSATION_REPOSITORY, useExisting: ConversationRepository },
    LangChainChatModel,
    { provide: CHAT_MODEL, useExisting: LangChainChatModel },
    WeaviateVectorStore,
    { provide: VECTOR_STORE, useExisting: WeaviateVectorStore },
    ChatUseCase,
    CreateConversationUseCase,
    ListConversationsUseCase,
    ListConversationMessagesUseCase,
  ],
})
export class ConversationsModule {}
