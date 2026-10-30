import type { Request } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

export interface RequestWithContext extends Request {
  requestId: string;
  user?: {
    id: string;
  };
}
