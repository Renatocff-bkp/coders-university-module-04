import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";

import { AgentsModule } from "./modules/agents/agents.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ConnectorsModule } from "./modules/connectors/connectors.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { HealthModule } from "./modules/health/health.module";
import { MediaModule } from "./modules/media/media.module";
import { PingModule } from "./modules/ping/ping.module";
import { DatabaseModule } from "./shared/database/database.module";
import { createPinoHttpOptions } from "./shared/logging/pino-options";
import { HttpMetricsInterceptor } from "./shared/observability/http-metrics.interceptor";
import { ObservabilityModule } from "./shared/observability/observability.module";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: createPinoHttpOptions(),
    }),
    ObservabilityModule,
    DatabaseModule,
    AgentsModule,
    AuthModule,
    ConnectorsModule,
    ConversationsModule,
    HealthModule,
    MediaModule,
    PingModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule {}
