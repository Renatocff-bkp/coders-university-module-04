import "reflect-metadata";

import { Logger } from "@nestjs/common";

import { getServerEnv } from "./shared/config/env";
import { startTelemetry } from "./shared/observability/telemetry";

async function bootstrap(): Promise<void> {
  const env = getServerEnv();
  // Telemetry starts before the application import so HTTP instrumentation can
  // patch Express while it is loaded.
  const telemetry = startTelemetry(env);
  const { createApp } = await import("./app.js");
  const app = await createApp();

  await app.listen(env.PORT);

  new Logger("Bootstrap").log(`API listening on http://localhost:${env.PORT}`);

  registerShutdown(async () => {
    await app.close();
    await telemetry?.shutdown();
  });
}

function registerShutdown(shutdown: () => Promise<void>): void {
  let stopping = false;

  const stop = async (signal: string): Promise<void> => {
    if (stopping) {
      return;
    }

    stopping = true;
    new Logger("Bootstrap").log(`Received ${signal}, shutting down`);

    try {
      await shutdown();
    } finally {
      process.exit(0);
    }
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      void stop(signal);
    });
  }
}

void bootstrap().catch((error: unknown) => {
  // Startup failures must reach the operator. Environment validation errors
  // name variables without printing their values.
  console.error(error);
  process.exitCode = 1;
});
