import { Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import { authTokens } from "../../../shared/database/schema";
import type { AuthToken, AuthTokenType } from "../domain/auth-token";
import type {
  AuthTokenRepository,
  CreateAuthTokenInput,
} from "../domain/repositories";
import { DrizzleTransactionManager } from "./drizzle-transaction-manager";

@Injectable()
export class DrizzleAuthTokenRepository implements AuthTokenRepository {
  constructor(private readonly transaction: DrizzleTransactionManager) {}

  async create(input: CreateAuthTokenInput): Promise<AuthToken> {
    const [row] = await this.transaction.executor
      .insert(authTokens)
      .values(input)
      .returning();

    if (!row) {
      throw new Error("Failed to persist auth token");
    }

    return { ...row, type: row.type as AuthTokenType };
  }

  async findByTokenHash(tokenHash: string): Promise<AuthToken | null> {
    const [row] = await this.transaction.executor
      .select()
      .from(authTokens)
      .where(eq(authTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row) {
      return null;
    }

    return { ...row, type: row.type as AuthTokenType };
  }

  async markUsedIfUnused(id: string, usedAt: Date): Promise<boolean> {
    const rows = await this.transaction.executor
      .update(authTokens)
      .set({ usedAt })
      .where(and(eq(authTokens.id, id), isNull(authTokens.usedAt)))
      .returning({ id: authTokens.id });

    return rows.length > 0;
  }

  async invalidateActiveByUserIdAndType(
    userId: string,
    type: AuthTokenType,
    usedAt: Date,
  ): Promise<number> {
    const rows = await this.transaction.executor
      .update(authTokens)
      .set({ usedAt })
      .where(
        and(
          eq(authTokens.userId, userId),
          eq(authTokens.type, type),
          isNull(authTokens.usedAt),
        ),
      )
      .returning({ id: authTokens.id });

    return rows.length;
  }
}
