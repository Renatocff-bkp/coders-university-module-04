import { Module } from "@nestjs/common";

import { GetPingUseCase } from "./application/get-ping.use-case";
import { PingController } from "./interface/ping.controller";

@Module({
  controllers: [PingController],
  providers: [GetPingUseCase],
})
export class PingModule {}
