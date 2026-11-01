import { Inject, Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";

import {
  DATABASE,
  type Database,
} from "../../../shared/database/database.module";
import { connectors } from "../../../shared/database/schema";
import type { Connector, ConnectorStatus } from "../domain/connector";

@Injectable()
export class ConnectorRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByHash(
    userId: string,
    sourceHash: string,
  ): Promise<Connector | null> {
    const rows = await this.db
      .select()
      .from(connectors)
      .where(
        and(
          eq(connectors.userId, userId),
          eq(connectors.sourceHash, sourceHash),
        ),
      )
      .limit(1);
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findById(id: string): Promise<Connector | null> {
    const rows = await this.db
      .select()
      .from(connectors)
      .where(eq(connectors.id, id))
      .limit(1);
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async listByUser(userId: string): Promise<Connector[]> {
    const rows = await this.db
      .select()
      .from(connectors)
      .where(eq(connectors.userId, userId));
    return rows.map((r) => this.toDomain(r));
  }

  async create(input: {
    userId: string;
    organizationId?: string | null;
    type: "file" | "url";
    name: string;
    sourceHash: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    url?: string | null;
    content?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<Connector> {
    const rows = await this.db
      .insert(connectors)
      .values({
        userId: input.userId,
        organizationId: input.organizationId ?? null,
        type: input.type,
        name: input.name,
        sourceHash: input.sourceHash,
        mimeType: input.mimeType ?? null,
        sizeBytes: input.sizeBytes ?? null,
        url: input.url ?? null,
        content: input.content ?? null,
        metadata: input.metadata ?? null,
        status: "pending",
      })
      .returning();
    return this.toDomain(rows[0]!);
  }

  async updateStatus(
    id: string,
    status: ConnectorStatus,
    errorMessage?: string | null,
  ): Promise<void> {
    await this.db
      .update(connectors)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        processedAt:
          status === "ready" || status === "failed" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(connectors.id, id));
  }

  async updateContent(id: string, content: string): Promise<void> {
    await this.db
      .update(connectors)
      .set({ content, updatedAt: new Date() })
      .where(eq(connectors.id, id));
  }

  private toDomain(row: typeof connectors.$inferSelect): Connector {
    return {
      id: row.id,
      userId: row.userId,
      organizationId: row.organizationId,
      type: row.type as "file" | "url",
      name: row.name,
      sourceHash: row.sourceHash,
      status: row.status as ConnectorStatus,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      url: row.url,
      content: row.content,
      errorMessage: row.errorMessage,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      processedAt: row.processedAt,
    };
  }
}
