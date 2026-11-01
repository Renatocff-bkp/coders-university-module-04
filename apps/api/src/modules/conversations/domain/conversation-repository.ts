export interface ConversationRecord {
  [key: string]: unknown;
}

export interface ConversationRepository {
  create(input: {
    userId: string;
    expertKey: string;
    title?: string | null;
  }): Promise<ConversationRecord>;
  listByUser(userId: string, expertKey?: string): Promise<ConversationRecord[]>;
  findById(id: string): Promise<ConversationRecord | null>;
  addMessage(input: {
    conversationId: string;
    role: string;
    content: string;
    metadata?: unknown;
  }): Promise<ConversationRecord>;
  listMessages(conversationId: string): Promise<ConversationRecord[]>;
}
