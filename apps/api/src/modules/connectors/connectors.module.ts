import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";

import { AuthModule } from "../auth/auth.module";

import {
  CONNECTOR_REPOSITORY,
  TEXT_EXTRACTOR,
  CHUNKER,
  VECTOR_STORE,
  ENVIRONMENT,
} from "./connectors.tokens";
import { ConnectorRepository } from "./infrastructure/connector.repository";
import { FetchTextExtractor } from "./infrastructure/fetch-text-extractor";
import { LangChainChunker } from "./infrastructure/langchain-chunker";
import { WeaviateVectorStore } from "./infrastructure/weaviate-vector-store";
import { ServerEnvEnvironment } from "./infrastructure/server-env.environment";
import { ProcessConnectorUseCase } from "./application/process-connector.use-case";
import { CreateConnectorFromFileUseCase } from "./application/create-connector-from-file.use-case";
import { CreateConnectorFromUrlUseCase } from "./application/create-connector-from-url.use-case";
import { ListConnectorsUseCase } from "./application/list-connectors.use-case";
import { GetConnectorUseCase } from "./application/get-connector.use-case";
import { UploadConnectorHandler } from "./interface/upload-connector.handler";
import { FromUrlConnectorHandler } from "./interface/from-url-connector.handler";
import { ListConnectorsHandler } from "./interface/list-connectors.handler";
import { GetConnectorHandler } from "./interface/get-connector.handler";

@Module({
  imports: [
    AuthModule,
    MulterModule.register({ limits: { fileSize: 25 * 1024 * 1024 } }),
  ],
  controllers: [
    UploadConnectorHandler,
    FromUrlConnectorHandler,
    ListConnectorsHandler,
    GetConnectorHandler,
  ],
  providers: [
    ConnectorRepository,
    { provide: CONNECTOR_REPOSITORY, useExisting: ConnectorRepository },
    FetchTextExtractor,
    { provide: TEXT_EXTRACTOR, useExisting: FetchTextExtractor },
    LangChainChunker,
    { provide: CHUNKER, useExisting: LangChainChunker },
    WeaviateVectorStore,
    { provide: VECTOR_STORE, useExisting: WeaviateVectorStore },
    ServerEnvEnvironment,
    { provide: ENVIRONMENT, useExisting: ServerEnvEnvironment },
    ProcessConnectorUseCase,
    CreateConnectorFromFileUseCase,
    CreateConnectorFromUrlUseCase,
    ListConnectorsUseCase,
    GetConnectorUseCase,
  ],
})
export class ConnectorsModule {}
