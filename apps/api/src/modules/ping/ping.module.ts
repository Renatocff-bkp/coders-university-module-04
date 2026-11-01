import { Module } from "@nestjs/common";

import { GetPingUseCase } from "./application/get-ping.use-case";
import { PingController } from "./interface/ping.controller";
import { PingMetricsInterceptor } from "./interface/ping-metrics.interceptor";

@Module({
  controllers: [PingController],
  providers: [GetPingUseCase, PingMetricsInterceptor],
})
export class PingModule {}
