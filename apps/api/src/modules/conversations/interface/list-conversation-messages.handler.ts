import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth";
import { ListConversationMessagesUseCase } from "../application/list-conversation-messages.use-case";

@Controller("conversations")
export class ListConversationMessagesHandler {
  constructor(
    private readonly listConversationMessages: ListConversationMessagesUseCase,
  ) {}

  @Get(":id/messages")
  @UseGuards(AuthGuard)
  async execute(@Param("id") id: string) {
    return this.listConversationMessages.execute({ conversationId: id });
  }
}
