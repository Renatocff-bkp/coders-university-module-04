import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";

import { AuthModule } from "../auth/auth.module";

import { ConnectorRepository } from "./infrastructure/connector.repository";
import { ProcessConnectorUseCase } from "./application/process-connector.use-case";
import {
  CreateConnectorFromFileUseCase,
  CreateConnectorFromUrlUseCase,
} from "./application/create-connector.use-case";
import { ConnectorsHandler } from "./interface/connectors.handler";

@Module({
  imports: [
    AuthModule,
    MulterModule.register({ limits: { fileSize: 25 * 1024 * 1024 } }),
  ],
  controllers: [ConnectorsHandler],
  providers: [
    ConnectorRepository,
    ProcessConnectorUseCase,
    CreateConnectorFromFileUseCase,
    CreateConnectorFromUrlUseCase,
  ],
})
export class ConnectorsModule {}
