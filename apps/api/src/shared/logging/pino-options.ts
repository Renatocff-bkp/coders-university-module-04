import { trace } from "@opentelemetry/api";
import pino, { type Level, type LevelWithSilent, type StreamEntry } from "pino";
import type { Options } from "pino-http";

import type { RequestWithContext } from "../http/request-context";
import { createLokiStream } from "./loki-stream";
import { testLogStream } from "./test-sink";

export function createPinoHttpOptions(): Options {
  const configuredLevel = process.env.LOG_LEVEL ?? "info";
  const level = configuredLevel as LevelWithSilent;
  const streamLevel: Level =
    configuredLevel === "silent" ? "fatal" : (configuredLevel as Level);
  const streams: StreamEntry[] = [];

  if (process.env.NODE_ENV === "test") {
    streams.push({ level: streamLevel, stream: testLogStream });
  } else {
    streams.push({ level: streamLevel, stream: process.stdout });
    streams.push({
      level: streamLevel,
      stream: createLokiStream({
        url: process.env.LOKI_URL ?? "http://localhost:3101",
        service: "api",
      }),
    });
  }

  return {
    level,
    base: { service: "api" },
    stream: pino.multistream(streams),
    genReqId: (request) =>
      (request as unknown as { id?: string }).id ??
      (request.headers["x-request-id"] as string | undefined) ??
      "",
    customProps: (request) => ({
      requestId: (request as unknown as { id?: string }).id,
      userId: (request as RequestWithContext).user?.id,
    }),
    mixin: () => {
      const spanContext = trace.getActiveSpan()?.spanContext();

      return {
        traceId: spanContext?.traceId,
        spanId: spanContext?.spanId,
      };
    },
    serializers: {
      req: (request) => ({
        method: request.method,
        url: request.url,
      }),
      res: (response) => ({
        statusCode: response.statusCode,
      }),
    },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-api-key']",
      ],
      censor: "[REDACTED]",
    },
  };
}
