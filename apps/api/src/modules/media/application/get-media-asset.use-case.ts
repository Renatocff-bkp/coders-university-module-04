import { Inject, Injectable } from "@nestjs/common";

import { MEDIA_REPOSITORY } from "../media.tokens";
import type { MediaRepository } from "../domain/media-repository";

@Injectable()
export class GetMediaAssetUseCase {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly repo: MediaRepository,
  ) {}

  async execute(input: { id: string }) {
    return this.repo.findById(input.id);
  }
}
