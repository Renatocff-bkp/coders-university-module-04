import { Writable } from "node:stream";

export interface LokiStreamOptions {
  url: string;
  service: string;
  batchSize?: number;
  flushIntervalMs?: number;
}

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_FLUSH_INTERVAL_MS = 2_000;

/**
 * Writes Pino JSON lines to Alloy's Loki push endpoint. Observability must
 * never break a request, so delivery failures are swallowed on purpose.
 */
export function createLokiStream(options: LokiStreamOptions): Writable {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
  const pushUrl = `${options.url.replace(/\/$/, "")}/loki/api/v1/push`;

  let batch: string[] = [];
  let timer: NodeJS.Timeout | null = null;
  let flushing = false;

  const clearTimer = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = (): void => {
    if (timer) {
      return;
    }

    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, flushIntervalMs);
    timer.unref?.();
  };

  const flush = async (): Promise<void> => {
    if (flushing || batch.length === 0) {
      return;
    }

    flushing = true;
    const lines = batch;
    batch = [];

    try {
      await fetch(pushUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          streams: [
            {
              stream: { service_name: options.service, job: options.service },
              values: lines.map((line) => [
                String(Date.now() * 1_000_000),
                line,
              ]),
            },
          ],
        }),
      });
    } catch {
      // Logs are best-effort; the request path must never fail because of Loki.
    } finally {
      flushing = false;

      if (batch.length > 0) {
        schedule();
      }
    }
  };

  return new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      const line = chunk.toString().trim();

      if (line) {
        batch.push(line);
      }

      if (batch.length >= batchSize) {
        clearTimer();
        void flush();
      } else {
        schedule();
      }

      callback();
    },
    final(callback) {
      clearTimer();
      void flush().finally(() => callback());
    },
  });
}
