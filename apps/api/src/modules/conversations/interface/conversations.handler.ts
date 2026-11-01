import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AuthGuard } from "../../auth";
import { ConversationRepository } from "../infrastructure/conversation.repository";
import { ChatUseCase } from "../application/chat.use-case";

@Controller("conversations")
export class ConversationsHandler {
  constructor(
    private readonly repo: ConversationRepository,
    private readonly chat: ChatUseCase,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() request: RequestWithContext,
    @Body() body: { expertKey: string; title?: string },
  ) {
    const userId = request.user?.id ?? "";
    return this.repo.create({
      userId,
      expertKey: body.expertKey,
      title: body.title,
    });
  }

  @Get()
  @UseGuards(AuthGuard)
  async list(
    @Req() request: RequestWithContext,
    @Query("expertKey") expertKey?: string,
  ) {
    const userId = request.user?.id ?? "";
    return this.repo.listByUser(userId, expertKey);
  }

  @Get(":id/messages")
  @UseGuards(AuthGuard)
  async messages(@Param("id") id: string) {
    return this.repo.listMessages(id);
  }

  @Post(":id/messages")
  @UseGuards(AuthGuard)
  async sendMessage(
    @Param("id") id: string,
    @Req() request: RequestWithContext,
    @Body() body: { content: string; expertKey: string },
    @Res() res: Response,
  ) {
    const userId = request.user?.id ?? "";
    const conversation = await this.repo.findById(id);
    const expertKey = body.expertKey || conversation?.expertKey || "";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    await this.chat.execute({
      conversationId: id,
      userId,
      expertKey,
      content: body.content,
      onToken: (token) => {
        res.write(
          `data: ${JSON.stringify({ type: "token", content: token })}\n\n`,
        );
      },
      onDone: (fullText) => {
        res.write(
          `data: ${JSON.stringify({ type: "done", content: fullText })}\n\n`,
        );
        res.end();
      },
      onError: (error) => {
        res.write(
          `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
        );
        res.end();
      },
    });
  }
}
