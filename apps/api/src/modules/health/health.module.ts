import { Module } from "@nestjs/common";

import { GetHealthUseCase } from "./application/get-health.use-case";
import { APP_INFO } from "./domain/health-status";
import { HealthController } from "./interface/health.controller";

@Module({
  controllers: [HealthController],
  providers: [
    GetHealthUseCase,
    {
      provide: APP_INFO,
      useValue: { name: "api", version: "0.1.0" },
    },
  ],
})
export class HealthModule {}
