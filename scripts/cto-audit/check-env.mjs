#!/usr/bin/env node
// Checks consistency between env vars referenced in code, .env.example and packages/env schema.
// Usage: node scripts/cto-audit/check-env.mjs [--root <dir>] [--out <file>]

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const args = process.argv.slice(2);
let root = process.cwd();
let outPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root") root = args[++i];
  else if (args[i] === "--out") outPath = args[++i];
}

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".jsx"]);
const SKIP_DIR = new Set(["node_modules", "dist", "coverage", ".git", ".turbo", ".next"]);

function walk(dir) {
  const result = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return result;
  }
  for (const name of entries) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) result.push(...walk(full));
    else if (CODE_EXT.has(extname(name))) result.push(full);
  }
  return result;
}

const targets = [
  join(root, "apps", "api", "src"),
  join(root, "apps", "app", "src"),
  join(root, "packages"),
];

const referenced = new Set();
for (const t of targets) {
  for (const file of walk(t)) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const re1 = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
    const re2 = /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g;
    let m;
    while ((m = re1.exec(content)) !== null) referenced.add(m[1]);
    while ((m = re2.exec(content)) !== null) referenced.add(m[1]);
  }
}

// .env.example
const examplePath = join(root, ".env.example");
let exampleKeys = new Set();
try {
  const content = readFileSync(examplePath, "utf8");
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (/^[A-Z_][A-Z0-9_]*$/.test(key)) exampleKeys.add(key);
  }
} catch {
  // ignore
}

// packages/env schema
const schemaPath = join(root, "packages", "env", "src", "server.ts");
let schemaKeys = new Set();
try {
  const content = readFileSync(schemaPath, "utf8");
  const re = /(?:^|\n)\s{2,}([A-Z_][A-Z0-9_]*):/g;
  let m;
  while ((m = re.exec(content)) !== null) schemaKeys.add(m[1]);
} catch {
  // ignore
}

const usedNotInExample = [...referenced].filter((k) => !exampleKeys.has(k)).sort();
const usedNotInSchema = [...referenced].filter((k) => !schemaKeys.has(k)).sort();
const schemaNotReferenced = [...schemaKeys].filter((k) => !referenced.has(k)).sort();
const exampleNotSchema = [...exampleKeys].filter((k) => !schemaKeys.has(k)).sort();

const result = {
  root,
  referenced: [...referenced].sort(),
  exampleKeys: [...exampleKeys].sort(),
  schemaKeys: [...schemaKeys].sort(),
  usedNotInExample,
  usedNotInSchema,
  schemaNotReferenced,
  exampleNotSchema,
};

const json = JSON.stringify(result, null, 2);
if (outPath) writeFileSync(outPath, json + "\n", "utf8");
else process.stdout.write(json + "\n");
