import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Response } from "express";

import { REQUEST_ID_HEADER, type RequestWithContext } from "./request-context";
import { resolveRequestId } from "./request-id";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    request: RequestWithContext,
    response: Response,
    next: NextFunction,
  ): void {
    const requestId =
      (request as unknown as { id?: string }).id ??
      resolveRequestId(request.headers[REQUEST_ID_HEADER]);

    request.requestId = requestId;
    (request as unknown as { id: string }).id = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
