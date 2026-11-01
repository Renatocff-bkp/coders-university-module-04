#!/usr/bin/env node
// Mechanical secret scanner for the CTO auditor.
// Usage: node scripts/cto-audit/scan-secrets.mjs [--root <dir>] [--out <file>]
// Prints JSON to stdout (or writes to --out).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";

const args = process.argv.slice(2);
let root = process.cwd();
let outPath = null;
let pathFilters = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root") root = args[++i];
  else if (args[i] === "--out") outPath = args[++i];
  else if (args[i] === "--paths") pathFilters = args[++i].split(",").map((s) => s.trim()).filter(Boolean);
}

const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip",
  ".gz", ".tar", ".mp4", ".mp3", ".woff", ".woff2", ".ttf", ".eot",
  ".lock", ".sqlite", ".db",
]);

const SKIP_PATH = /(node_modules|\/dist\/|\/coverage\/|\.git\/|\.turbo\/)/;

const RULES = [
  { id: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: "openai-key", re: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { id: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { id: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { id: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { id: "connection-string-with-password", re: /(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^:\s]+:[^@\s]{4,}@[^\s]+/g },
  {
    id: "hardcoded-secret-assignment",
    re: /\b(password|passwd|secret|api[_-]?key|api[_-]?secret|auth[_-]?token|access[_-]?token|private[_-]?key|credential)\s*[:=]\s*["'][^"'\s]{8,}["']/gi,
  },
];

const PLACEHOLDER = /example|changeme|password|secret|xxx|your_|<|\$\{|placeholder|dummy|fake|test-token|localhost/i;

function isTestFile(p) {
  return /\.(test|spec)\.[a-z]+$/i.test(p) || /__tests__\//.test(p) || /\/db\//.test(p) || /\/migrations\//.test(p);
}

function maskValue(v) {
  if (v.length <= 8) return "****";
  return v.slice(0, 4) + "****" + v.slice(-2);
}

function maskSnippet(line, match) {
  return line.replace(match, maskValue(match));
}

let files = [];
try {
  const out = execFileSync("git", ["-C", root, "ls-files"], { encoding: "utf8" });
  files = out.split(/\r?\n/).filter(Boolean);
} catch {
  // Fallback: empty; agent should report inability to enumerate.
  files = [];
}

const findings = [];

for (const rel of files) {
  if (SKIP_PATH.test("/" + rel + "/")) continue;
  if (BINARY_EXT.has(extname(rel).toLowerCase())) continue;
  if (pathFilters && !pathFilters.some((p) => rel === p || rel.startsWith(p.replace(/\\/g, "/") + "/"))) continue;
  const full = root.replace(/[\\/]+$/, "") + "/" + rel.replace(/\\/g, "/");
  let content;
  try {
    content = readFileSync(full, "utf8");
  } catch {
    continue;
  }
  // Skip files that look binary
  if (content.includes("\u0000")) continue;

  const lines = content.split(/\r?\n/);
  const testFile = isTestFile(rel);

  lines.forEach((line, idx) => {
    for (const rule of RULES) {
      if (rule.id === "hardcoded-secret-assignment" && testFile) continue;
      // reset lastIndex
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        const matched = m[0];
        // placeholder filtering for assignment rule
        if (rule.id === "hardcoded-secret-assignment" && /classe:|bg-|nome:/.test(line)) continue;
        if (rule.id === "hardcoded-secret-assignment") {
          const valMatch = matched.match(/["']([^"']+)["']/);
          const val = valMatch ? valMatch[1] : "";
          if (PLACEHOLDER.test(val)) continue;
        }
        // connection string: require a password-like segment
        findings.push({
          file: rel,
          line: idx + 1,
          rule: rule.id,
          maskedSnippet: maskSnippet(line.trim().slice(0, 160), matched),
        });
        // avoid duplicate overlapping reports on same line for same rule
        break;
      }
    }
  });
}

const result = { root, filesScanned: files.length, findings };
const json = JSON.stringify(result, null, 2);
if (outPath) {
  writeFileSync(outPath, json + "\n", "utf8");
} else {
  process.stdout.write(json + "\n");
}
