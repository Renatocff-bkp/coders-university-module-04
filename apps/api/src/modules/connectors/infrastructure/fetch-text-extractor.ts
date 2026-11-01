import { Injectable } from "@nestjs/common";

import type {
  TextExtractor,
  TextExtractorInput,
} from "../domain/text-extractor";

@Injectable()
export class FetchTextExtractor implements TextExtractor {
  private pdfParseModule: Promise<{
    default?: (b: Buffer) => Promise<{ text: string }>;
  }> | null = null;

  private getPdfParse() {
    if (!this.pdfParseModule) {
      this.pdfParseModule = import("pdf-parse") as Promise<{
        default?: (b: Buffer) => Promise<{ text: string }>;
      }>;
    }
    return this.pdfParseModule;
  }

  async extract(input: TextExtractorInput): Promise<string> {
    if (input.type === "url" && input.url) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const res = await fetch(input.url, { signal: controller.signal });
        let html = await res.text();
        if (html.length > 2 * 1024 * 1024) {
          html = html.slice(0, 2 * 1024 * 1024);
        }
        return html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } finally {
        clearTimeout(timeout);
      }
    }
    if (input.content) {
      const buf = Buffer.from(input.content, "base64");
      const mime = input.mimeType ?? "";
      if (mime.includes("pdf")) {
        const mod = await this.getPdfParse();
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
