import { Controller, Get, Query, Req } from "@nestjs/common";

import type { RequestWithContext } from "../../../shared/http/request-context";
import { MetricsService } from "../../../shared/observability/metrics.service";
import { GetPingUseCase } from "../application/get-ping.use-case";
import type { PingResult } from "../domain/ping-result";
import { PingQueryDto } from "./ping-query.dto";

@Controller("ping")
export class PingController {
  constructor(
    private readonly getPing: GetPingUseCase,
    private readonly metrics: MetricsService,
  ) {}

  @Get()
  ping(
    @Query() _query: PingQueryDto,
    @Req() request: RequestWithContext,
  ): PingResult {
    this.metrics.pingTotal.add(1);

    return this.getPing.execute(request.requestId);
  }
}
