import { Controller, Get, Param, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../../auth";
import { GetMediaAssetUseCase } from "../application/get-media-asset.use-case";

@Controller("media")
export class GetMediaAssetHandler {
  constructor(private readonly getMediaAsset: GetMediaAssetUseCase) {}

  @Get(":id")
  @UseGuards(AuthGuard)
  async execute(@Param("id") id: string, @Res() res: Response) {
    const asset = await this.getMediaAsset.execute({ id });
    if (!asset) {
      res.status(404).end();
      return;
    }
    if (asset.url) {
      res.redirect(asset.url as string);
      return;
    }
    if (asset.data) {
      const buf = Buffer.from(asset.data as string, "base64");
      res.setHeader("Content-Type", asset.mimeType as string);
      res.send(buf);
      return;
    }
    res.status(404).end();
  }
}
