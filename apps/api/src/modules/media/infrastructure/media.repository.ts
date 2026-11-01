import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";

import {
  DATABASE,
  type Database,
} from "../../../shared/database/database.module";
import { mediaAssets } from "../../../shared/database/schema";

@Injectable()
export class MediaRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(input: {
    userId: string;
    messageId?: string | null;
    type: string;
    mimeType: string;
    data?: string | null;
    url?: string | null;
    prompt: string;
    model: string;
  }) {
    const rows = await this.db
      .insert(mediaAssets)
      .values({
        userId: input.userId,
        messageId: input.messageId ?? null,
        type: input.type,
        mimeType: input.mimeType,
        data: input.data ?? null,
        url: input.url ?? null,
        prompt: input.prompt,
        model: input.model,
      })
      .returning();
    return rows[0]!;
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);
    return rows[0] ?? null;
  }
}
