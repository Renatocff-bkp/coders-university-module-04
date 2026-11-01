import { Injectable } from "@nestjs/common";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import type { Chunk, Chunker } from "../domain/chunker";

@Injectable()
export class LangChainChunker implements Chunker {
  async chunk(text: string, sourceName: string): Promise<Chunk[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const docs = await splitter.createDocuments([text], [{ sourceName }]);
    return docs.map((d) => ({ pageContent: d.pageContent }));
  }
}
