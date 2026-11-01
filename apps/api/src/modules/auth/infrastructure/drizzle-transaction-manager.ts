import { AsyncLocalStorage } from "node:async_hooks";

import { Inject, Injectable } from "@nestjs/common";

import {
  DATABASE,
  type Database,
} from "../../../shared/database/database.module";
import type { TransactionManager } from "../domain/transactions";

/**
 * Exposes the database executor for the current transaction, falling back to
 * the root connection when no transaction is open.
 *
 * Drizzle's transaction object has the same query API as the root database but
 * is not assignable to `NodePgDatabase`; the cast is limited to this boundary.
 */
@Injectable()
export class DrizzleTransactionManager implements TransactionManager {
  private readonly storage = new AsyncLocalStorage<Database>();

  constructor(@Inject(DATABASE) private readonly root: Database) {}

  get executor(): Database {
    return this.storage.getStore() ?? this.root;
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.storage.getStore()) {
      return work();
    }

    return this.root.transaction((transaction) =>
      this.storage.run(transaction as Database, work),
    );
  }
}
