import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { loadEnv, type ServerEnv } from "@repo/env";

let cached: ServerEnv | undefined;

function loadDotEnv(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
  ];

  for (const file of candidates) {
    if (existsSync(file)) {
      loadEnvFile(file);
      return;
    }
  }
}

/**
 * Lazily validates the environment so modules can be imported before the
 * dotenv file is read. Throws on the first invalid configuration.
 */
export function getServerEnv(): ServerEnv {
  if (!cached) {
    loadDotEnv();
    cached = loadEnv();
  }

  return cached;
}
