import { Injectable } from "@nestjs/common";
import { metrics, type Counter, type Histogram } from "@opentelemetry/api";

@Injectable()
export class MetricsService {
  private readonly meter = metrics.getMeter("api");

  readonly pingTotal: Counter = this.meter.createCounter("ping_total", {
    description: "Total number of ping requests",
  });

  readonly httpRequestsTotal: Counter = this.meter.createCounter(
    "http_requests_total",
    { description: "Total number of HTTP requests handled by the API" },
  );

  readonly httpRequestDuration: Histogram = this.meter.createHistogram(
    "http_request_duration_seconds",
    {
      description: "HTTP request duration in seconds",
      unit: "s",
    },
  );
}
