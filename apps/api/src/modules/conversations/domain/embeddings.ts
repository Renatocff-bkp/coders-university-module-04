export interface Embeddings {
  embedQuery(text: string): Promise<number[]>;
}
