/**
 * Runs a unit of work inside a single database transaction.
 *
 * Implementations may join an already open transaction, so callers can compose
 * use cases and services without knowing whether they are the transaction
 * boundary.
 */
export interface TransactionManager {
  run<T>(work: () => Promise<T>): Promise<T>;
}
