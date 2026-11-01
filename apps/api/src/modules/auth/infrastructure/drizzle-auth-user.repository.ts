import { Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";

import { authUsers } from "../../../shared/database/schema";
import type { AuthUser } from "../domain/auth-user";
import type {
  AuthUserRepository,
  CreateAuthUserInput,
} from "../domain/repositories";
import { DrizzleTransactionManager } from "./drizzle-transaction-manager";

@Injectable()
export class DrizzleAuthUserRepository implements AuthUserRepository {
  constructor(private readonly transaction: DrizzleTransactionManager) {}

  async findById(id: string): Promise<AuthUser | null> {
    const [row] = await this.transaction.executor
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, id))
      .limit(1);

    return row ?? null;
  }

  async findByEmail(normalizedEmail: string): Promise<AuthUser | null> {
    const [row] = await this.transaction.executor
      .select()
      .from(authUsers)
      .where(eq(sql`lower(${authUsers.email})`, normalizedEmail))
      .limit(1);

    return row ?? null;
  }

  async create(input: CreateAuthUserInput): Promise<AuthUser> {
    const [row] = await this.transaction.executor
      .insert(authUsers)
      .values(input)
      .returning();

    if (!row) {
      throw new Error("Failed to persist auth user");
    }

    return row;
  }

  async markEmailConfirmed(id: string, confirmedAt: Date): Promise<AuthUser> {
    const [row] = await this.transaction.executor
      .update(authUsers)
      .set({ emailConfirmedAt: confirmedAt, updatedAt: confirmedAt })
      .where(eq(authUsers.id, id))
      .returning();

    if (!row) {
      throw new Error("Failed to confirm auth user");
    }

    return row;
  }

  async updatePasswordHash(
    id: string,
    passwordHash: string,
    updatedAt: Date,
  ): Promise<AuthUser> {
    const [row] = await this.transaction.executor
      .update(authUsers)
      .set({ passwordHash, updatedAt })
      .where(eq(authUsers.id, id))
      .returning();

    if (!row) {
      throw new Error("Failed to update auth user password");
    }

    return row;
  }
}
