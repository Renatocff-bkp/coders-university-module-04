import { Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import { authSessions } from "../../../shared/database/schema";
import type { AuthSession } from "../domain/auth-session";
import type {
  AuthSessionRepository,
  CreateAuthSessionInput,
} from "../domain/repositories";
import { DrizzleTransactionManager } from "./drizzle-transaction-manager";

@Injectable()
export class DrizzleAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly transaction: DrizzleTransactionManager) {}

  async create(input: CreateAuthSessionInput): Promise<AuthSession> {
    const [row] = await this.transaction.executor
      .insert(authSessions)
      .values(input)
      .returning();

    if (!row) {
      throw new Error("Failed to persist auth session");
    }

    return row;
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    const [row] = await this.transaction.executor
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash))
      .limit(1);

    return row ?? null;
  }

  async revokeActiveByUserId(userId: string, revokedAt: Date): Promise<number> {
    const rows = await this.transaction.executor
      .update(authSessions)
      .set({ revokedAt })
      .where(
        and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)),
      )
      .returning({ id: authSessions.id });

    return rows.length;
  }

  async revokeById(id: string, revokedAt: Date): Promise<void> {
    await this.transaction.executor
      .update(authSessions)
      .set({ revokedAt })
      .where(eq(authSessions.id, id));
  }

  async touchLastUsed(id: string, lastUsedAt: Date): Promise<void> {
    await this.transaction.executor
      .update(authSessions)
      .set({ lastUsedAt })
      .where(eq(authSessions.id, id));
  }
}
