export interface Chunk {
  pageContent: string;
}

export interface Chunker {
  chunk(text: string, sourceName: string): Promise<Chunk[]>;
}
