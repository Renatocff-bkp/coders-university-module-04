#!/usr/bin/env node
/**
 * Wrapper for the Grafana MCP server.
 *
 * Reads GRAFANA_URL and GRAFANA_SERVICE_ACCOUNT_TOKEN from the repository's
 * .env file so each developer can use their own token without hardcoding it.
 * The Grafana MCP server runs inside Docker, so the URL host is rewritten from
 * localhost/127.0.0.1 to host.docker.internal when needed.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function loadEnv(filePath) {
  const env = {};
  let raw;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return env;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) env[key] = value;
  }
  return env;
}

const envPath = resolve(repoRoot, ".env");
const fileEnv = loadEnv(envPath);

const grafanaUrl = process.env.GRAFANA_URL || fileEnv.GRAFANA_URL || "http://localhost:3003";
const token = process.env.GRAFANA_SERVICE_ACCOUNT_TOKEN || fileEnv.GRAFANA_SERVICE_ACCOUNT_TOKEN;

if (!token) {
  process.stderr.write(
    "grafana-mcp: GRAFANA_SERVICE_ACCOUNT_TOKEN is missing.\n" +
      "Add it to your .env (see .env.example) after creating a Grafana service account token.\n",
  );
  process.exit(1);
}

// The MCP server runs in a container; reach the host's Grafana via host.docker.internal.
const containerUrl = grafanaUrl.replace(/localhost|127\.0\.0\.1/, "host.docker.internal");

const child = spawn(
  "docker",
  [
    "run",
    "--rm",
    "-i",
    "-e",
    `GRAFANA_URL=${containerUrl}`,
    "-e",
    `GRAFANA_SERVICE_ACCOUNT_TOKEN=${token}`,
    "grafana/mcp-grafana",
    "-t",
    "stdio",
    "--usage-stats=disabled",
  ],
  { stdio: "inherit" },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

child.on("error", (err) => {
  process.stderr.write(`grafana-mcp: failed to start docker: ${err.message}\n`);
  process.exit(1);
});