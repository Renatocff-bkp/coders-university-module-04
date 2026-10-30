import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { Response } from "express";
import { finalize, type Observable } from "rxjs";

import type { RequestWithContext } from "../http/request-context";
import { MetricsService } from "./metrics.service";

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();
    const startedAt = performance.now();

    return next.handle().pipe(
      finalize(() => {
        const attributes = {
          method: request.method,
          route: request.route?.path ?? "unmatched",
          status_code: response.statusCode,
        };

        this.metrics.httpRequestsTotal.add(1, attributes);
        this.metrics.httpRequestDuration.record(
          (performance.now() - startedAt) / 1_000,
          attributes,
        );
      }),
    );
  }
}
