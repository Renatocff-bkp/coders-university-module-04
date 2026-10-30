import { Controller, Get } from "@nestjs/common";

import { GetHealthUseCase } from "../application/get-health.use-case";
import type { HealthStatus } from "../domain/health-status";

@Controller("health")
export class HealthController {
  constructor(private readonly getHealth: GetHealthUseCase) {}

  @Get()
  check(): HealthStatus {
    return this.getHealth.execute();
  }
}
