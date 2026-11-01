export interface MediaRecord {
  [key: string]: unknown;
}

export interface MediaRepository {
  create(input: {
    userId: string;
    messageId?: string | null;
    type: string;
    mimeType: string;
    data?: string | null;
    url?: string | null;
    prompt: string;
    model: string;
  }): Promise<MediaRecord>;
  findById(id: string): Promise<MediaRecord | null>;
}
