import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import {
  defaultResource,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { ServerEnv } from "@repo/env";

export interface Telemetry {
  shutdown(): Promise<void>;
}

/**
 * Starts OTLP traces and metrics. Must run before Express is imported so the
 * HTTP instrumentation can patch the module while it is loaded.
 */
export function startTelemetry(env: ServerEnv): Telemetry | null {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.OTEL_SDK_DISABLED === "true"
  ) {
    return null;
  }

  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, "");
  const sdk = new NodeSDK({
    serviceName: "api",
    resource: defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "api",
        [ATTR_SERVICE_VERSION]: "0.1.0",
      }),
    ),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
        exportIntervalMillis: 10_000,
      }),
    ],
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
  });

  sdk.start();

  return {
    shutdown: () => sdk.shutdown(),
  };
}
