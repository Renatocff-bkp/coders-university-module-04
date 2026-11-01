import { Module } from "@nestjs/common";

import { GetHealthUseCase } from "./application/get-health.use-case";
import { APP_INFO } from "./domain/health-status";
import { HealthHandler } from "./interface/health.handler";

@Module({
  controllers: [HealthHandler],
  providers: [
    GetHealthUseCase,
    {
      provide: APP_INFO,
      useValue: { name: "api", version: "0.1.0" },
    },
  ],
})
export class HealthModule {}
