import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";

import { MetricsService } from "../../../shared/observability/metrics.service";

@Injectable()
export class PingMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    this.metrics.pingTotal.add(1);

    return next.handle();
  }
}
