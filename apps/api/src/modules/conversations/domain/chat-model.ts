export interface ChatModel {
  stream(
    messages: Array<{ role: string; content: string }>,
  ): Promise<AsyncIterable<string>>;
}
