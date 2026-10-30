export interface TokenGenerator {
  /** Creates an opaque, URL-safe token that is never persisted. */
  generate(): string;
  /** Returns the deterministic digest persisted in the database. */
  hash(token: string): string;
}
