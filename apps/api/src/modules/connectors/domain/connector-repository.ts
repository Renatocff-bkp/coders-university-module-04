import type { Connector, ConnectorStatus, ConnectorType } from "./connector";

export interface ConnectorRepository {
  findByHash(userId: string, sourceHash: string): Promise<Connector | null>;
  findById(id: string): Promise<Connector | null>;
  listByUser(userId: string): Promise<Connector[]>;
  create(input: {
    userId: string;
    organizationId?: string | null;
    type: ConnectorType;
    name: string;
    sourceHash: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    url?: string | null;
    content?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<Connector>;
  updateStatus(
    id: string,
    status: ConnectorStatus,
    errorMessage?: string | null,
  ): Promise<void>;
  updateContent(id: string, content: string): Promise<void>;
}
