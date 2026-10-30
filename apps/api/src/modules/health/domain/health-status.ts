export interface AppInfo {
  name: string;
  version: string;
}

export const APP_INFO = "APP_INFO";

export interface HealthStatus {
  status: "ok";
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}
