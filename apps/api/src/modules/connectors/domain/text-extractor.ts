export interface TextExtractorInput {
  type: string;
  content: string | null;
  url: string | null;
  mimeType: string | null;
  name: string;
}

export interface TextExtractor {
  extract(input: TextExtractorInput): Promise<string>;
}
