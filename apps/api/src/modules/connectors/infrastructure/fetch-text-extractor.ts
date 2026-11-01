import { Injectable } from "@nestjs/common";

import type {
  TextExtractor,
  TextExtractorInput,
} from "../domain/text-extractor";

@Injectable()
export class FetchTextExtractor implements TextExtractor {
  async extract(input: TextExtractorInput): Promise<string> {
    if (input.type === "url" && input.url) {
      const res = await fetch(input.url);
      const html = await res.text();
      return html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    if (input.content) {
      const buf = Buffer.from(input.content, "base64");
      const mime = input.mimeType ?? "";
      if (mime.includes("pdf")) {
        const mod = (await import("pdf-parse")) as {
          default?: (b: Buffer) => Promise<{ text: string }>;
        };
        const pdfParse =
          mod.default ??
          (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
        const data = await pdfParse(buf);
        return data.text;
      }
      return buf.toString("utf-8");
    }
    return "";
  }
}
