import { clearAuthToken } from "../modules/auth/auth-storage";

export const REQUEST_ID_HEADER = "x-request-id";

const SESSION_ENDED_PATH = "/auth/sign-in?session=ended";

const DEFAULT_BASE_URL = "http://localhost:3002";

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? DEFAULT_BASE_URL;

export interface FieldError {
  field: string;
  messages?: string[];
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
  fields?: FieldError[];
  requestId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: FieldError[];
  readonly requestId?: string;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    fields?: FieldError[];
    requestId?: string;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.fields = init.fields;
    this.requestId = init.requestId;
  }
}

export interface HealthStatus {
  status: "ok";
  service: "api";
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface PublicAuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionResponse {
  user: PublicAuthUser;
}

export interface PingResult {
  message: string;
  requestId: string;
  latencyMs?: number;
}

export interface ApiResponse<T> {
  data: T;
  requestId: string;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function generateRequestId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function resolveRequestId(value: string | undefined): string {
  if (value && REQUEST_ID_PATTERN.test(value)) {
    return value;
  }

  return generateRequestId();
}

function hasAuthorizationHeader(headers?: Record<string, string>): boolean {
  return Object.keys(headers ?? {}).some(
    (name) => name.toLowerCase() === "authorization",
  );
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const requestId = generateRequestId();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body === undefined
        ? {}
        : { "content-type": "application/json" }),
      ...options.headers,
      [REQUEST_ID_HEADER]: requestId,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  const responseRequestId =
    response.headers.get(REQUEST_ID_HEADER) ?? requestId;

  const payload = (await response.json().catch(() => undefined)) as
    { error?: ApiErrorBody } | undefined;

  if (!response.ok) {
    if (response.status === 401 && hasAuthorizationHeader(options.headers)) {
      clearAuthToken();
      window.location.assign(SESSION_ENDED_PATH);
    }

    throw new ApiError({
      status: response.status,
      code: payload?.error?.code ?? "UNKNOWN_ERROR",
      message:
        payload?.error?.message ??
        `Request failed with status ${response.status}`,
      fields: payload?.error?.fields,
      requestId: payload?.error?.requestId ?? responseRequestId,
    });
  }

  return { data: payload as T, requestId: responseRequestId };
}

export async function getHealth(signal?: AbortSignal): Promise<HealthStatus> {
  const { data } = await apiRequest<HealthStatus>("/health", { signal });

  return data;
}

export async function getPing(signal?: AbortSignal): Promise<PingResult> {
  const { data, requestId } = await apiRequest<PingResult>("/api/v1/ping", {
    signal,
  });

  return { ...data, requestId };
}

export async function getSession(token?: string): Promise<AuthSessionResponse> {
  const { data } = await apiRequest<AuthSessionResponse>(
    "/api/v1/auth/session",
    {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    },
  );

  return data;
}
