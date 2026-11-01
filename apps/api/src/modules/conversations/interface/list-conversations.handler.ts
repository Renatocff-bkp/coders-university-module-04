import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AuthGuard } from "../../auth";
import { ListConversationsUseCase } from "../application/list-conversations.use-case";

@Controller("conversations")
export class ListConversationsHandler {
  constructor(private readonly listConversations: ListConversationsUseCase) {}

  @Get()
  @UseGuards(AuthGuard)
  async execute(
    @Req() request: RequestWithContext,
    @Query("expertKey") expertKey?: string,
  ) {
    const userId = request.user?.id ?? "";
    return this.listConversations.execute({ userId, expertKey });
  }
}
