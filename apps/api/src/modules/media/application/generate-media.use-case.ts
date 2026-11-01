import { Inject, Injectable } from "@nestjs/common";

import { MEDIA_REPOSITORY, IMAGE_GENERATOR } from "../media.tokens";
import type { MediaRepository } from "../domain/media-repository";
import type { ImageGenerator } from "../domain/image-generator";

@Injectable()
export class GenerateMediaUseCase {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly repo: MediaRepository,
    @Inject(IMAGE_GENERATOR) private readonly imageGenerator: ImageGenerator,
  ) {}

  async generateImage(input: { userId: string; prompt: string }) {
    const { b64, url } = await this.imageGenerator.generate({
      prompt: input.prompt,
    });
    const asset = await this.repo.create({
      userId: input.userId,
      type: "image",
      mimeType: "image/png",
      data: b64,
      url,
      prompt: input.prompt,
      model: "gpt-image-2",
    });
    return asset;
  }

  async execute(input: {
    userId: string;
    type: "image" | "video";
    prompt: string;
  }) {
    if (input.type === "image") {
      return this.generateImage({ userId: input.userId, prompt: input.prompt });
    }
    return this.generateVideo({ userId: input.userId, prompt: input.prompt });
  }

  async generateVideo(input: { userId: string; prompt: string }) {
    // Video generation via Gemini is not implemented in this iteration.
    throw new Error("Video generation not implemented yet");
  }
}
