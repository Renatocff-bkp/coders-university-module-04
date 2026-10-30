import {
  BadRequestException,
  RequestMethod,
  ValidationPipe,
  type INestApplication,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import type { NextFunction, Response } from "express";

import { AppModule } from "./app.module";
import { getServerEnv } from "./shared/config/env";
import { HttpExceptionFilter } from "./shared/http/http-exception.filter";
import {
  REQUEST_ID_HEADER,
  type RequestWithContext,
} from "./shared/http/request-context";
import { RequestIdMiddleware } from "./shared/http/request-id.middleware";
import { flattenValidationErrors } from "./shared/http/validation";

/**
 * Builds the Nest application with the same global configuration used by
 * production and by integration tests.
 */
export async function createApp(): Promise<INestApplication> {
  const env = getServerEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(
    (request: RequestWithContext, response: Response, next: NextFunction) => {
      requestIdMiddleware.use(request, response, next);
    },
  );

  app.setGlobalPrefix("api/v1", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          fields: flattenValidationErrors(errors),
        }),
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", REQUEST_ID_HEADER],
    exposedHeaders: [REQUEST_ID_HEADER],
  });

  const express = app.getHttpAdapter().getInstance() as {
    disable?: (setting: string) => void;
  };
  express.disable?.("x-powered-by");

  return app;
}
