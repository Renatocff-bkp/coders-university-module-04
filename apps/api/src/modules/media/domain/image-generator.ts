export interface ImageGeneratorResult {
  b64: string | null;
  url: string | null;
}

export interface ImageGenerator {
  generate(input: { prompt: string }): Promise<ImageGeneratorResult>;
}
