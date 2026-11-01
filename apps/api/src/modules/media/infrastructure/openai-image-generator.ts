import { Injectable } from "@nestjs/common";

import { getServerEnv } from "../../../shared/config/env";

import type {
  ImageGenerator,
  ImageGeneratorResult,
} from "../domain/image-generator";

@Injectable()
export class OpenAIImageGenerator implements ImageGenerator {
  async generate(input: { prompt: string }): Promise<ImageGeneratorResult> {
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
    return { b64: item?.b64_json ?? null, url: item?.url ?? null };
  }
}
