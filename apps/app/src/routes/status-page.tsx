import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui";

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
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ← Back to workspace
            </Link>
          </div>
          <Badge
            variant={
              operational ? "default" : failure ? "destructive" : "secondary"
            }
            className="gap-2"
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${
                operational
                  ? "bg-primary-foreground"
                  : failure
                    ? "bg-destructive-foreground"
                    : "bg-muted-foreground"
              }`}
            />
            {statusMessage}
          </Badge>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="mb-8">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Operational status
          </p>
          <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Service status
          </h1>
          <p className="mt-2 max-w-prose text-base text-muted-foreground">
            Live checks from the local API. Each request sends a generated{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              x-request-id
            </code>{" "}
            so backend logs and traces can be correlated with the client.
          </p>
        </section>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Current status</CardTitle>
            <p
              role="status"
              aria-live="polite"
              className="text-sm font-medium text-muted-foreground"
            >
              {statusMessage}
            </p>
          </CardHeader>

          <CardContent>
            {failure ? (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {errorMessage}
              </div>
            ) : null}

            <dl className="divide-y divide-border/60">
              {STATUS_CHECKS.map((check) => {
                const ok = check.id === "health" ? healthOk : pingOk;
                const pending =
                  check.id === "health" ? health.isPending : ping.isPending;

                return (
                  <div
                    key={check.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`size-2 rounded-full ${
                          pending
                            ? "bg-muted-foreground/40"
                            : ok
                              ? "bg-primary"
                              : "bg-destructive"
                        }`}
                      />
                      <dt className="text-sm font-medium">{check.label}</dt>
                    </div>
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
                );
              })}
            </dl>

            {failure ? (
              <div className="mt-6">
                <Button variant="outline" size="sm" onClick={retry}>
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
