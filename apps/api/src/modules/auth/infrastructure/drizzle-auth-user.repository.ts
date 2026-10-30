import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";

import {
  DATABASE,
  type Database,
} from "../../../shared/database/database.module";
import { authUsers } from "../../../shared/database/schema";
import type { AuthUser } from "../domain/auth-user";
import type {
  AuthUserRepository,
  CreateAuthUserInput,
} from "../domain/repositories";

@Injectable()
export class DrizzleAuthUserRepository implements AuthUserRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async findById(id: string): Promise<AuthUser | null> {
    const [row] = await this.database
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, id))
      .limit(1);

    return row ?? null;
  }

  async findByEmail(normalizedEmail: string): Promise<AuthUser | null> {
    const [row] = await this.database
      .select()
      .from(authUsers)
      .where(eq(sql`lower(${authUsers.email})`, normalizedEmail))
      .limit(1);

    return row ?? null;
  }

  async create(input: CreateAuthUserInput): Promise<AuthUser> {
    const [row] = await this.database
      .insert(authUsers)
      .values(input)
      .returning();

    if (!row) {
      throw new Error("Failed to persist auth user");
    }

    return row;
  }
}
