import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AuthGuard } from "../../auth/interface/auth-guard";
import { GenerateMediaUseCase } from "../application/generate-media.use-case";
import { MediaRepository } from "../infrastructure/media.repository";

@Controller("media")
export class MediaHandler {
  constructor(
    private readonly generate: GenerateMediaUseCase,
    private readonly repo: MediaRepository,
  ) {}

  @Post("generate")
  @UseGuards(AuthGuard)
  async generateMedia(
    @Req() request: RequestWithContext,
    @Body() body: { type: "image" | "video"; prompt: string },
  ) {
    const userId = request.user?.id ?? "";
    if (body.type === "image") {
      return this.generate.generateImage({ userId, prompt: body.prompt });
    }
    return this.generate.generateVideo({ userId, prompt: body.prompt });
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  async get(@Param("id") id: string, @Res() res: Response) {
    const asset = await this.repo.findById(id);
    if (!asset) {
      res.status(404).end();
      return;
    }
    if (asset.url) {
      res.redirect(asset.url);
      return;
    }
    if (asset.data) {
      const buf = Buffer.from(asset.data, "base64");
      res.setHeader("Content-Type", asset.mimeType);
      res.send(buf);
      return;
    }
    res.status(404).end();
  }
}
