import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AuthGuard } from "../../auth";
import { ChatUseCase } from "../application/chat.use-case";

@Controller("conversations")
export class SendMessageHandler {
  constructor(private readonly chat: ChatUseCase) {}

  @Post(":id/messages")
  @UseGuards(AuthGuard)
  async execute(
    @Param("id") id: string,
    @Req() request: RequestWithContext,
    @Body() body: { content: string; expertKey?: string },
    @Res() res: Response,
  ) {
    const userId = request.user?.id ?? "";
    const expertKey = body.expertKey ?? "";

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
