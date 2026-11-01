import { Inject, Injectable } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";

import {
  DATABASE,
  type Database,
} from "../../../shared/database/database.module";
import { conversations, messages } from "../../../shared/database/schema";

import type { ConversationRepository as ConversationRepositoryPort } from "../domain/conversation-repository";

@Injectable()
export class ConversationRepository implements ConversationRepositoryPort {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(input: {
    userId: string;
    expertKey: string;
    title?: string | null;
  }) {
    const rows = await this.db
      .insert(conversations)
      .values({
        userId: input.userId,
        expertKey: input.expertKey,
        title: input.title ?? null,
      })
      .returning();
    return rows[0]!;
  }

  async listByUser(userId: string, expertKey?: string) {
    if (expertKey) {
      return this.db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.userId, userId),
            eq(conversations.expertKey, expertKey),
          ),
        )
        .orderBy(desc(conversations.updatedAt));
    }
    return this.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async addMessage(input: {
    conversationId: string;
    role: string;
    content: string;
    metadata?: unknown;
  }) {
    const rows = await this.db
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        metadata: input.metadata ?? null,
      })
      .returning();
    return rows[0]!;
  }

  async listMessages(conversationId: string) {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
}
