import {
  Global,
  Inject,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnv } from "../config/env";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
export type DatabasePool = Pool;

export const DATABASE = Symbol("DATABASE");
export const DATABASE_POOL = Symbol("DATABASE_POOL");

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: () =>
        new Pool({
          connectionString: getServerEnv().DATABASE_URL,
          max: 10,
        }),
    },
    {
      provide: DATABASE,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
    },
    DatabaseLifecycle,
  ],
  exports: [DATABASE, DATABASE_POOL],
})
export class DatabaseModule {}
