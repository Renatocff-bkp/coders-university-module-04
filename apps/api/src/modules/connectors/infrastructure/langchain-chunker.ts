import { Injectable } from "@nestjs/common";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import type { Chunk, Chunker } from "../domain/chunker";

@Injectable()
export class LangChainChunker implements Chunker {
  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  async chunk(text: string, sourceName: string): Promise<Chunk[]> {
    const docs = await this.splitter.createDocuments([text], [{ sourceName }]);
    return docs.map((d) => ({ pageContent: d.pageContent }));
  }
}
