#!/usr/bin/env node
/**
 * Checks that every local infrastructure endpoint is reachable.
 *
 * Usage:
 *   node scripts/infra-health.mjs          # full stack (Postgres + LGTM)
 *   node scripts/infra-health.mjs --core   # skips Tempo and Mimir
 */

import net from "node:net";

const coreOnly = process.argv.includes("--core");

async function checkHttp(service) {
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
}

async function checkTcp(service) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok, detail) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...service, ok, detail });
    };

    socket.setTimeout(5000);
    socket.on("connect", () => finish(true, "TCP open"));
    socket.on("timeout", () => finish(false, "timeout"));
    socket.on("error", (error) =>
      finish(false, error instanceof Error ? error.message : String(error)),
    );

    socket.connect(service.port, service.host);
  });
}

const services = [
  {
    name: "Postgres",
    type: "tcp",
    host: "127.0.0.1",
    port: 54322,
    core: true,
  },
  {
    name: "Grafana",
    type: "http",
    url: "http://localhost:3003/api/health",
    accept: (status) => status === 200,
    core: true,
  },
  {
    name: "Loki",
    type: "http",
    url: "http://localhost:3100/ready",
    accept: (status) => status === 200,
    core: true,
  },
  {
    name: "Alloy",
    type: "http",
    url: "http://localhost:12345/-/ready",
    accept: (status) => status === 200,
    core: true,
  },
  {
    name: "Tempo",
    type: "http",
    url: "http://localhost:3200/ready",
    accept: (status) => status === 200,
    core: false,
  },
  {
    name: "Mimir",
    type: "http",
    url: "http://localhost:9009/ready",
    accept: (status) => status === 200,
    core: false,
  },
];

const selected = services.filter(
  (service) => !coreOnly || service.core !== false,
);

const results = await Promise.all(
  selected.map((service) =>
    service.type === "tcp" ? checkTcp(service) : checkHttp(service),
  ),
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
