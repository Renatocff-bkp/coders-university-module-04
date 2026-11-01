import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AuthGuard } from "../../auth";
import { CreateConversationUseCase } from "../application/create-conversation.use-case";

@Controller("conversations")
export class CreateConversationHandler {
  constructor(private readonly createConversation: CreateConversationUseCase) {}

  @Post()
  @UseGuards(AuthGuard)
  async execute(
    @Req() request: RequestWithContext,
    @Body() body: { expertKey: string; title?: string },
  ) {
    const userId = request.user?.id ?? "";
    return this.createConversation.execute({
      userId,
      expertKey: body.expertKey,
      title: body.title,
    });
  }
}
