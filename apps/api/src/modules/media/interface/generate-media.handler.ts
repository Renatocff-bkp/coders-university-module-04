import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AuthGuard } from "../../auth";
import { GenerateMediaUseCase } from "../application/generate-media.use-case";

@Controller("media")
export class GenerateMediaHandler {
  constructor(private readonly generateMedia: GenerateMediaUseCase) {}

  @Post("generate")
  @UseGuards(AuthGuard)
  async execute(
    @Req() request: RequestWithContext,
    @Body() body: { type: "image" | "video"; prompt: string },
  ) {
    const userId = request.user?.id ?? "";
    return this.generateMedia.execute({
      userId,
      type: body.type,
      prompt: body.prompt,
    });
  }
}
