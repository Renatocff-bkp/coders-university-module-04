import {
  Controller,
  Get,
  Query,
  Req,
  UseInterceptors,
} from "@nestjs/common";

import type { RequestWithContext } from "../../../shared/http/request-context";
import { GetPingUseCase } from "../application/get-ping.use-case";
import type { PingResult } from "../domain/ping-result";
import { PingQueryDto } from "./ping-query.dto";
import { PingMetricsInterceptor } from "./ping-metrics.interceptor";

@Controller("ping")
@UseInterceptors(PingMetricsInterceptor)
export class PingController {
  constructor(private readonly getPing: GetPingUseCase) {}

  @Get()
  ping(
    @Query() _query: PingQueryDto,
    @Req() request: RequestWithContext,
  ): PingResult {
    return this.getPing.execute(request.requestId);
  }
}