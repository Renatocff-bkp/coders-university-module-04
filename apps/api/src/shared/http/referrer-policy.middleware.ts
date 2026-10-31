import { Injectable } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import type { RequestWithContext } from "./request-context";

@Injectable()
export class ReferrerPolicyMiddleware {
  use(
    _request: RequestWithContext,
    response: Response,
    next: NextFunction,
  ): void {
    response.setHeader("Referrer-Policy", "no-referrer");

    next();
  }
}
