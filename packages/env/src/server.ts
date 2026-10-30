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
  SUPABASE_URL: z.url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
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
