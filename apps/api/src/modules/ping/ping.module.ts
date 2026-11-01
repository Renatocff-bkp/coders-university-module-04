import { Module } from "@nestjs/common";

import { GetPingUseCase } from "./application/get-ping.use-case";
import { PingHandler } from "./interface/ping.handler";
import { PingMetricsInterceptor } from "./interface/ping-metrics.interceptor";

@Module({
  controllers: [PingHandler],
  providers: [GetPingUseCase, PingMetricsInterceptor],
})
export class PingModule {}
