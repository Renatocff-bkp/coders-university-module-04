import { Inject, Injectable } from "@nestjs/common";
import { getServerEnv } from "../../../shared/config/env";

import { MEDIA_REPOSITORY } from "../media.tokens";
import type { MediaRepository } from "../domain/media-repository";

@Injectable()
export class GenerateMediaUseCase {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly repo: MediaRepository,
  ) {}

  async generateImage(input: { userId: string; prompt: string }) {
    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: input.prompt,
        size: "1024x1024",
        n: 1,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Image generation failed: ${res.status} ${text}`);
    }
    const json = (await res.json()) as {
      data?: { b64_json?: string; url?: string }[];
    };
    const item = json.data?.[0];
    const b64 = item?.b64_json ?? null;
    const url = item?.url ?? null;
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

  async generateVideo(input: { userId: string; prompt: string }) {
    // Video generation via Gemini is not implemented in this iteration.
    throw new Error("Video generation not implemented yet");
  }
}
