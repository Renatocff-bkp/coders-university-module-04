import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";

import { AuthModule } from "../auth/auth.module";

import { CONNECTOR_REPOSITORY } from "./connectors.tokens";
import { ConnectorRepository } from "./infrastructure/connector.repository";
import { ProcessConnectorUseCase } from "./application/process-connector.use-case";
import { CreateConnectorFromFileUseCase } from "./application/create-connector-from-file.use-case";
import { CreateConnectorFromUrlUseCase } from "./application/create-connector-from-url.use-case";
import { ListConnectorsUseCase } from "./application/list-connectors.use-case";
import { GetConnectorUseCase } from "./application/get-connector.use-case";
import { ConnectorsHandler } from "./interface/connectors.handler";

@Module({
  imports: [
    AuthModule,
    MulterModule.register({ limits: { fileSize: 25 * 1024 * 1024 } }),
  ],
  controllers: [ConnectorsHandler],
  providers: [
    ConnectorRepository,
    { provide: CONNECTOR_REPOSITORY, useExisting: ConnectorRepository },
    ProcessConnectorUseCase,
    CreateConnectorFromFileUseCase,
    CreateConnectorFromUrlUseCase,
    ListConnectorsUseCase,
    GetConnectorUseCase,
  ],
})
export class ConnectorsModule {}
