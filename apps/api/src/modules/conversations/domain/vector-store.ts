export interface VectorStore {
  retrieveContext(query: string, userId: string): Promise<string>;
}
