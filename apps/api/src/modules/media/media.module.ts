import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { MediaRepository } from "./infrastructure/media.repository";
import { GenerateMediaUseCase } from "./application/generate-media.use-case";
import { MediaHandler } from "./interface/media.handler";

@Module({
  imports: [AuthModule],
  controllers: [MediaHandler],
  providers: [MediaRepository, GenerateMediaUseCase],
})
export class MediaModule {}
