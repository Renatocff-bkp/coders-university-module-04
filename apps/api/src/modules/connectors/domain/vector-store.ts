export interface VectorStoreInput {
  id: string;
  name: string;
}

export interface VectorStore {
  store(
    chunks: Array<{ pageContent: string }>,
    connector: VectorStoreInput,
    userId: string,
  ): Promise<void>;
}
