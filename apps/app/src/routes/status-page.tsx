import { useQuery } from "@tanstack/react-query";

import { Button } from "@repo/ui";

import { ApiError, getHealth, getPing } from "../shared/api-client";

const STATUS_CHECKS = [
  { id: "health", label: "Health", href: "/health" },
  { id: "ping", label: "Ping", href: "/api/v1/ping" },
] as const;

export default function StatusPage() {
  const health = useQuery({
    queryKey: ["api", "health"],
    queryFn: () => getHealth(),
  });

  const ping = useQuery({
    queryKey: ["api", "ping"],
    queryFn: async () => {
      const startedAt = performance.now();
      const result = await getPing();

      return {
        ...result,
        latencyMs: Math.round(performance.now() - startedAt),
      };
    },
  });

  const isChecking = health.isPending || ping.isPending;
  const healthOk = health.isSuccess && health.data?.status === "ok";
  const pingOk = ping.isSuccess && ping.data?.message === "pong";
  const operational = healthOk && pingOk;

  const healthError = health.error instanceof Error ? health.error : undefined;
  const pingError = ping.error instanceof Error ? ping.error : undefined;
  const failure =
    (!healthOk && healthError) || (!pingOk && pingError) ? true : false;

  const statusMessage = isChecking
    ? "Checking the API…"
    : operational
      ? "Operational"
      : "Attention needed";

  const errorMessage =
    (healthError instanceof ApiError && healthError.message) ||
    (pingError instanceof ApiError && pingError.message) ||
    "We could not reach the API. Start it with npm run dev:api and retry.";

  const retry = (): void => {
    void health.refetch();
    void ping.refetch();
  };

  return (
    <main className="min-h-dvh bg-linen text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16 sm:py-24">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Operational status
          </p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Service status
          </h1>
          <p className="max-w-prose text-base text-muted-foreground">
            Live checks from the local API. Each request sends a generated{" "}
            <code className="font-mono text-sm">x-request-id</code> so backend
            logs and traces can be correlated with the client.
          </p>
        </header>

        <section
          aria-labelledby="current-status"
          className="rounded-2xl border border-alice-blue bg-card p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="current-status" className="text-lg font-semibold">
              Current status
            </h2>
            <p
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-2 rounded-full border border-alice-blue bg-secondary px-3 py-1 text-sm font-medium"
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${
                  operational ? "bg-primary" : "bg-destructive"
                }`}
              />
              {statusMessage}
            </p>
          </div>

          {failure ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <dl className="mt-6 divide-y divide-alice-blue">
            {STATUS_CHECKS.map((check) => (
              <div
                key={check.id}
                className="flex items-baseline justify-between gap-4 py-4"
              >
                <dt className="text-sm font-medium">{check.label}</dt>
                <dd className="font-mono text-sm text-muted-foreground">
                  {check.id === "health"
                    ? health.data
                      ? `ok · v${health.data.version} · uptime ${health.data.uptimeSeconds}s`
                      : "checking…"
                    : ping.data
                      ? `pong · ${ping.data.latencyMs ?? 0}ms`
                      : "checking…"}
                </dd>
              </div>
            ))}
          </dl>

          {failure ? (
            <div className="mt-6">
              <Button variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
