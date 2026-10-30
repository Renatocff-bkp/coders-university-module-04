import { Inject, Injectable } from "@nestjs/common";

import {
  APP_INFO,
  type AppInfo,
  type HealthStatus,
} from "../domain/health-status";

@Injectable()
export class GetHealthUseCase {
  constructor(@Inject(APP_INFO) private readonly appInfo: AppInfo) {}

  execute(now: Date = new Date()): HealthStatus {
    return {
      status: "ok",
      service: this.appInfo.name,
      version: this.appInfo.version,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: now.toISOString(),
    };
  }
}
