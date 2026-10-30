import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Response } from "express";

import { REQUEST_ID_HEADER, type RequestWithContext } from "./request-context";
import { resolveRequestId } from "./request-id";
import type { FieldError } from "./validation";

interface HttpErrorBody {
  code?: string;
  message?: string | string[];
  fields?: FieldError[];
}

const STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "UNPROCESSABLE_ENTITY",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_SERVER_ERROR",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHttpErrorBody(value: unknown): value is HttpErrorBody {
  return isRecord(value);
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithContext>();

    const requestId =
      request.requestId ?? resolveRequestId(request.headers[REQUEST_ID_HEADER]);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = STATUS_CODES[status] ?? "ERROR";
    let message = "Unexpected error";
    let fields: FieldError[] | undefined;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (typeof body === "string") {
        message = body;
      } else if (isHttpErrorBody(body)) {
        if (typeof body.code === "string") {
          code = body.code;
        }

        if (typeof body.message === "string") {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = body.message.join(", ");
        }

        fields = body.fields;
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      message = "Internal server error";

      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status} requestId=${requestId} userId=${request.user?.id ?? "-"}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.originalUrl} -> ${status} requestId=${requestId} userId=${request.user?.id ?? "-"}`,
      );
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(fields ? { fields } : {}),
        requestId,
      },
    });
  }
}
