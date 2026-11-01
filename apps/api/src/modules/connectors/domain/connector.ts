export type ConnectorType = "file" | "url";
export type ConnectorStatus = "pending" | "processing" | "ready" | "failed";

export interface Connector {
  id: string;
  userId: string;
  organizationId: string | null;
  type: ConnectorType;
  name: string;
  sourceHash: string;
  status: ConnectorStatus;
  mimeType: string | null;
  sizeBytes: number | null;
  url: string | null;
  content: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
}
