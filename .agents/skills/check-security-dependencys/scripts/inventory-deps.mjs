#!/usr/bin/env node
// Dependency inventory for the npm workspaces monorepo.
// Dependency-free on purpose: runs before any install/audit step.
//
// Usage:
//   node .agents/skills/check-security-dependencys/scripts/inventory-deps.mjs \
//     --json .security-deps/<run-id>/inventory.json \
//     --md   .security-deps/<run-id>/inventory.md
//
// Exit codes: 0 = ok, 2 = invalid input.

import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT_MARKERS = ["apps", "packages"];
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".turbo",
  ".next",
  ".refactor",
  ".cto-audit",
]);

function parseArgs(argv) {
  const args = { json: null, md: null };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case "--json":
        args.json = next;
        i += 1;
        break;
      case "--md":
        args.md = next;
        i += 1;
        break;
      case "--help":
      case "-h":
        console.log(
          [
            "inventory-deps.mjs --json <file> [--md <file>]",
            "",
            "Lists every workspace package.json (root, apps/*, packages/*) with dependencies and devDependencies.",
          ].join("\n"),
        );
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(2);
        }
    }
  }

  return args;
}

async function exists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collect(dir, workspaces) {
  const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
  const name = pkg.name ?? path.basename(dir);
  const workspace =
    path.relative(process.cwd(), dir).split(path.sep).join("/") || path.basename(dir);
  workspaces.push({
    name,
    path: workspace,
    private: Boolean(pkg.private),
    dependencies: Object.keys(pkg.dependencies ?? {}),
    devDependencies: Object.keys(pkg.devDependencies ?? {}),
  });
}

async function listWorkspaces(dir, workspaces) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);

    if (entry.name.startsWith("@")) {
      const scopedEntries = await readdir(full, { withFileTypes: true });
      for (const scoped of scopedEntries) {
        if (!scoped.isDirectory()) {
          continue;
        }
        if (SKIP_DIRS.has(scoped.name)) {
          continue;
        }
        const candidate = path.join(full, scoped.name);
        if (await exists(path.join(candidate, "package.json"))) {
          await collect(candidate, workspaces);
        }
      }
      continue;
    }

    if (await exists(path.join(full, "package.json"))) {
      await collect(full, workspaces);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const workspaces = [];
  await collect(process.cwd(), workspaces);
  for (const marker of ROOT_MARKERS) {
    const markerPath = path.join(process.cwd(), marker);
    try {
      await listWorkspaces(markerPath, workspaces);
    } catch {
      continue;
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    root: process.cwd().split(path.sep).join("/"),
    workspaces: workspaces.sort((a, b) => a.path.localeCompare(b.path)),
    totals: {
      workspaces: workspaces.length,
      dependencies: workspaces.reduce((sum, ws) => sum + ws.dependencies.length, 0),
      devDependencies: workspaces.reduce((sum, ws) => sum + ws.devDependencies.length, 0),
    },
  };

  if (args.json) {
    const resolved = path.resolve(args.json);
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }

  const lines = [
    "# Inventário de dependências — monorepo",
    "",
    `- Root: \`${result.root}\``,
    `- Gerado em: ${result.generatedAt}`,
    `- Workspaces: ${result.totals.workspaces} | deps: ${result.totals.dependencies} | devDeps: ${result.totals.devDependencies}`,
    "",
    "| Workspace | Path | Dependencies | DevDependencies |",
    "| ---------- | ---- | ------------ | --------------- |",
  ];

  for (const ws of result.workspaces) {
    lines.push(
      `| \`${ws.name}\` | \`${ws.path}\` | ${ws.dependencies.length} | ${ws.devDependencies.length} |`,
    );
    lines.push("");
    lines.push(`**Dependencies:** ${ws.dependencies.join(", ") || "—"}`);
    lines.push("");
    lines.push(`**DevDependencies:** ${ws.devDependencies.join(", ") || "—"}`);
    lines.push("");
  }

  const markdown = `${lines.join("\n")}\n`;

  if (args.md) {
    const resolved = path.resolve(args.md);
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, markdown, "utf8");
  }

  if (!args.json && !args.md) {
    console.log(markdown);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
