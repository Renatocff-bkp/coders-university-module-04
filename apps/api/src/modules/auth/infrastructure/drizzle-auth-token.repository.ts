import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";

import {
  DATABASE,
  type Database,
} from "../../../shared/database/database.module";
import { authTokens } from "../../../shared/database/schema";
import type { AuthToken, AuthTokenType } from "../domain/auth-token";
import type {
  AuthTokenRepository,
  CreateAuthTokenInput,
} from "../domain/repositories";

@Injectable()
export class DrizzleAuthTokenRepository implements AuthTokenRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async create(input: CreateAuthTokenInput): Promise<AuthToken> {
    const [row] = await this.database
      .insert(authTokens)
      .values(input)
      .returning();

    if (!row) {
      throw new Error("Failed to persist auth token");
    }

    return { ...row, type: row.type as AuthTokenType };
  }

  async findByTokenHash(tokenHash: string): Promise<AuthToken | null> {
    const [row] = await this.database
      .select()
      .from(authTokens)
      .where(eq(authTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row) {
      return null;
    }

    return { ...row, type: row.type as AuthTokenType };
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    await this.database
      .update(authTokens)
      .set({ usedAt })
      .where(eq(authTokens.id, id));
  }
}
