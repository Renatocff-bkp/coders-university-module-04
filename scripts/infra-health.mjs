#!/usr/bin/env node
/**
 * Checks that every local infrastructure endpoint is reachable.
 *
 * Usage:
 *   node scripts/infra-health.mjs          # full stack (Supabase + LGTM)
 *   node scripts/infra-health.mjs --core   # skips Tempo and Mimir
 */

const coreOnly = process.argv.includes("--core");

const services = [
  {
    name: "Supabase API",
    url: "http://127.0.0.1:54321/rest/v1/",
    accept: (status) => status < 500,
  },
  {
    name: "Supabase Studio",
    url: "http://127.0.0.1:54323/",
    accept: (status) => status < 500,
  },
  {
    name: "Grafana",
    url: "http://localhost:3003/api/health",
    accept: (status) => status === 200,
  },
  {
    name: "Loki",
    url: "http://localhost:3100/ready",
    accept: (status) => status === 200,
  },
  {
    name: "Alloy",
    url: "http://localhost:12345/-/ready",
    accept: (status) => status === 200,
  },
  {
    name: "Tempo",
    url: "http://localhost:3200/ready",
    accept: (status) => status === 200,
    core: false,
  },
  {
    name: "Mimir",
    url: "http://localhost:9009/ready",
    accept: (status) => status === 200,
    core: false,
  },
];

const selected = services.filter(
  (service) => !coreOnly || service.core !== false,
);

const results = await Promise.all(
  selected.map(async (service) => {
    try {
      const response = await fetch(service.url, {
        signal: AbortSignal.timeout(5000),
      });

      if (service.accept(response.status)) {
        return { ...service, ok: true, detail: `HTTP ${response.status}` };
      }

      return { ...service, ok: false, detail: `HTTP ${response.status}` };
    } catch (error) {
      return {
        ...service,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }),
);

const width = Math.max(...results.map((result) => result.name.length));
let failures = 0;

for (const result of results) {
  const status = result.ok ? "OK  " : "FAIL";

  if (!result.ok) {
    failures += 1;
  }

  console.log(`${status} ${result.name.padEnd(width)}  ${result.detail}`);
}

if (failures > 0) {
  console.error(`\n${failures}/${results.length} service(s) unreachable.`);
  process.exitCode = 1;
} else {
  console.log(`\n${results.length}/${results.length} service(s) reachable.`);
}
