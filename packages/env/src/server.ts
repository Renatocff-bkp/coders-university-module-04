import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine(
    (value) =>
      value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "DATABASE_URL must be a PostgreSQL connection string",
  );

export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce
    .number()
    .int("PORT must be an integer")
    .min(1, "PORT must be between 1 and 65535")
    .max(65535, "PORT must be between 1 and 65535")
    .default(3002),
  DATABASE_URL: postgresUrl,
  CORS_ORIGIN: z
    .url("CORS_ORIGIN must be a valid URL")
    .default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  LOKI_URL: z
    .url("LOKI_URL must be a valid URL")
    .default("http://localhost:3101"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .url("OTEL_EXPORTER_OTLP_ENDPOINT must be a valid URL")
    .default("http://localhost:4318"),
  APP_URL: z
    .url("APP_URL must be a valid URL")
    .default("http://localhost:5173"),
  SESSION_TTL_DAYS: z.coerce
    .number()
    .int("SESSION_TTL_DAYS must be an integer")
    .min(1, "SESSION_TTL_DAYS must be between 1 and 30")
    .max(30, "SESSION_TTL_DAYS must be between 1 and 30")
    .default(7),
  EMAIL_FROM: z
    .email("EMAIL_FROM must be a valid email address")
    .default("no-reply@coders-university.local"),
  MAILTRAP_SMTP_HOST: z
    .string()
    .min(1, "MAILTRAP_SMTP_HOST is required")
    .default("mailtrap-smtp.io"),
  MAILTRAP_SMTP_PORT: z.coerce
    .number()
    .int("MAILTRAP_SMTP_PORT must be an integer")
    .min(1, "MAILTRAP_SMTP_PORT must be between 1 and 65535")
    .max(65535, "MAILTRAP_SMTP_PORT must be between 1 and 65535")
    .default(2525),
  MAILTRAP_SMTP_USER: z
    .string()
    .min(1, "MAILTRAP_SMTP_USER is required")
    .default("user"),
  MAILTRAP_SMTP_PASS: z
    .string()
    .min(1, "MAILTRAP_SMTP_PASS is required")
    .default("pass"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required").default(""),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates the process environment. The thrown error names every invalid
 * variable, but never includes the rejected value, so secrets cannot leak
 * into startup logs.
 */
export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment variables — ${problems}`);
  }

  return result.data;
}
