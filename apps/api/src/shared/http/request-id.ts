import { randomUUID } from "node:crypto";

import { REQUEST_ID_HEADER } from "./request-context";

const REQUEST_ID_PATTERN = /^[\w.:-]{1,128}$/;

/**
 * Accepts a caller-provided request id only when it is safe to log and
 * echo back. Anything else is replaced by a fresh UUID.
 */
export function resolveRequestId(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate && REQUEST_ID_PATTERN.test(candidate)) {
    return candidate;
  }

  return randomUUID();
}

export function readRequestIdHeader(
  headers: Record<string, string | string[] | undefined>,
): string {
  return resolveRequestId(headers[REQUEST_ID_HEADER]);
}
