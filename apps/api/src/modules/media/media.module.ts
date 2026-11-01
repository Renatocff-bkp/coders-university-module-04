import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { MEDIA_REPOSITORY, IMAGE_GENERATOR } from "./media.tokens";
import { MediaRepository } from "./infrastructure/media.repository";
import { OpenAIImageGenerator } from "./infrastructure/openai-image-generator";
import { GenerateMediaUseCase } from "./application/generate-media.use-case";
import { GetMediaAssetUseCase } from "./application/get-media-asset.use-case";
import { GenerateMediaHandler } from "./interface/generate-media.handler";
import { GetMediaAssetHandler } from "./interface/get-media-asset.handler";

@Module({
  imports: [AuthModule],
  controllers: [GenerateMediaHandler, GetMediaAssetHandler],
  providers: [
    MediaRepository,
    { provide: MEDIA_REPOSITORY, useExisting: MediaRepository },
    OpenAIImageGenerator,
    { provide: IMAGE_GENERATOR, useExisting: OpenAIImageGenerator },
    GenerateMediaUseCase,
    GetMediaAssetUseCase,
  ],
})
export class MediaModule {}
