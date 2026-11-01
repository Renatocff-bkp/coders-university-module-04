import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { MEDIA_REPOSITORY } from "./media.tokens";
import { MediaRepository } from "./infrastructure/media.repository";
import { GenerateMediaUseCase } from "./application/generate-media.use-case";
import { MediaHandler } from "./interface/media.handler";

@Module({
  imports: [AuthModule],
  controllers: [MediaHandler],
  providers: [
    MediaRepository,
    { provide: MEDIA_REPOSITORY, useExisting: MediaRepository },
    GenerateMediaUseCase,
  ],
})
export class MediaModule {}
