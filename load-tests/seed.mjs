#!/usr/bin/env node
import bcrypt from "bcrypt";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { SEED, SEED_VERSION, requiredSeedCounts } from "./lib/config.js";
import { validateSeed } from "./lib/data.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const ENV_FILE = resolve(ROOT, ".env");
const DATA_DIR = resolve(HERE, ".data");
const SEED_FILE = resolve(DATA_DIR, "seed.json");

const BATCH_SIZE = 500;
const BCRYPT_ROUNDS = 12;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

const NOW = new Date();

const USER_COLUMNS = [
  "id",
  "first_name",
  "last_name",
  "email",
  "password_hash",
  "email_confirmed_at",
];

const SESSION_COLUMNS = [
  "id",
  "user_id",
  "token_hash",
  "user_agent",
  "ip_address",
  "expires_at",
];

const TOKEN_COLUMNS = [
  "id",
  "user_id",
  "type",
  "token_hash",
  "expires_at",
  "created_at",
];

function generateToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(rawToken) {
  return createHash("sha256").update(rawToken).digest("hex");
}

function buildUsers(kind, count, confirmed, passwordHash) {
  return Array.from({ length: count }, (_, index) => ({
    id: randomUUID(),
    firstName: "Load",
    lastName: "Test",
    email: `${SEED.emailPrefix}-${kind}-${String(index).padStart(5, "0")}@${
      SEED.emailDomain
    }`,
    passwordHash,
    emailConfirmedAt: confirmed ? NOW : null,
  }));
}

function buildSessions(users, count) {
  return Array.from({ length: count }, (_, index) => {
    const rawToken = generateToken();

    return {
      rawToken,
      row: [
        randomUUID(),
        users[index % users.length].id,
        hashToken(rawToken),
        "k6-loadtest",
        null,
        new Date(NOW.getTime() + SESSION_TTL_MS),
      ],
    };
  });
}

function buildOneTimeTokens(users, type, ttlMs) {
  return users.map((user) => {
    const rawToken = generateToken();

    return {
      rawToken,
      row: [
        randomUUID(),
        user.id,
        type,
        hashToken(rawToken),
        new Date(NOW.getTime() + ttlMs),
        NOW,
      ],
    };
  });
}

function userRow(user) {
  return [
    user.id,
    user.firstName,
    user.lastName,
    user.email,
    user.passwordHash,
    user.emailConfirmedAt,
  ];
}

async function insertRows(client, table, columns, rows) {
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const params = [];
    const placeholders = batch.map((row) => {
      const values = row.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });

      return `(${values.join(", ")})`;
    });

    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(
        ", ",
      )}`,
      params,
    );
  }
}

function loadDatabaseUrl() {
  if (existsSync(ENV_FILE)) {
    loadEnvFile(ENV_FILE);
  }

  const argument = process.argv.find((value) =>
    value.startsWith("--database-url="),
  );

  if (argument) {
    return argument.slice("--database-url=".length);
  }

  return process.env.DATABASE_URL;
}

function buildSeedPayload({
  signInUsers,
  forgotPasswordUsers,
  sessionTokens,
  signOutTokens,
  confirmationTokens,
  resetTokens,
}) {
  return {
    version: SEED_VERSION,
    generatedAt: NOW.toISOString(),
    password: SEED.password,
    resetPassword: SEED.resetPassword,
    counts: {
      ...SEED.counts,
    },
    signInEmails: signInUsers.map((user) => user.email),
    forgotPasswordEmails: forgotPasswordUsers.map((user) => user.email),
    sessionTokens: sessionTokens.map((token) => token.rawToken),
    signOutTokens: signOutTokens.map((token) => token.rawToken),
    confirmationTokens: confirmationTokens.map((token) => token.rawToken),
    resetTokens: resetTokens.map((token) => token.rawToken),
  };
}

async function writeSeedFile(payload) {
  await mkdir(DATA_DIR, { recursive: true });

  const temporaryFile = `${SEED_FILE}.tmp`;
  await writeFile(
    temporaryFile,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  await rename(temporaryFile, SEED_FILE);
}

async function seedDatabase(payload) {
  const databaseUrl = loadDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add it to the root .env or pass --database-url=postgresql://...",
    );
  }

  const passwordHash = await bcrypt.hash(SEED.password, BCRYPT_ROUNDS);
  const counts = SEED.counts;

  const signInUsers = buildUsers(
    "signin",
    counts.signInUsers,
    true,
    passwordHash,
  );
  const forgotPasswordUsers = buildUsers(
    "forgot",
    counts.forgotPasswordUsers,
    true,
    passwordHash,
  );
  const sessionUsers = buildUsers(
    "session",
    counts.sessionUsers,
    true,
    passwordHash,
  );
  const signOutUsers = buildUsers(
    "signout",
    counts.signOutUsers,
    true,
    passwordHash,
  );
  const confirmationUsers = buildUsers(
    "confirm",
    counts.confirmationTokens,
    false,
    passwordHash,
  );
  const resetUsers = buildUsers(
    "reset",
    counts.resetTokens,
    true,
    passwordHash,
  );

  const sessionTokens = buildSessions(sessionUsers, counts.sessionTokens);
  const signOutTokens = buildSessions(signOutUsers, counts.signOutTokens);
  const confirmationTokens = buildOneTimeTokens(
    confirmationUsers,
    "email_confirmation",
    CONFIRMATION_TTL_MS,
  );
  const resetTokens = buildOneTimeTokens(
    resetUsers,
    "password_reset",
    RESET_TTL_MS,
  );

  const seedPayload = buildSeedPayload({
    signInUsers,
    forgotPasswordUsers,
    sessionTokens,
    signOutTokens,
    confirmationTokens,
    resetTokens,
  });

  const errors = validateSeed(seedPayload, requiredSeedCounts("stress"));

  if (errors.length > 0) {
    throw new Error(
      [
        "Seed counts are not enough for the stress profile:",
        ...errors.map((error) => `- ${error}`),
      ].join("\n"),
    );
  }

  const users = [
    ...signInUsers,
    ...forgotPasswordUsers,
    ...sessionUsers,
    ...signOutUsers,
    ...confirmationUsers,
    ...resetUsers,
  ];

  const client = new pg.Client({ connectionString: databaseUrl });
  const startedAt = performance.now();
  let removed = 0;

  await client.connect();

  try {
    await client.query("BEGIN");

    const cleanup = await client.query(
      "DELETE FROM auth_users WHERE lower(email) LIKE $1",
      [`${SEED.emailPrefix}-%@${SEED.emailDomain}`],
    );
    removed = cleanup.rowCount ?? 0;

    await insertRows(client, "auth_users", USER_COLUMNS, users.map(userRow));
    await insertRows(
      client,
      "auth_sessions",
      SESSION_COLUMNS,
      [...sessionTokens, ...signOutTokens].map((token) => token.row),
    );
    await insertRows(
      client,
      "auth_tokens",
      TOKEN_COLUMNS,
      [...confirmationTokens, ...resetTokens].map((token) => token.row),
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }

  await writeSeedFile(seedPayload);

  return {
    elapsedSeconds: (performance.now() - startedAt) / 1000,
    removed,
    users: users.length,
    sessionTokens: sessionTokens.length,
    signOutTokens: signOutTokens.length,
    confirmationTokens: confirmationTokens.length,
    resetTokens: resetTokens.length,
  };
}

const result = await seedDatabase();

console.log(`\nSeed complete in ${result.elapsedSeconds.toFixed(1)}s.`);
console.log(`  previous k6 users removed: ${result.removed}`);
console.log(`  users: ${result.users}`);
console.log(`  session tokens (reused): ${result.sessionTokens}`);
console.log(`  sign-out tokens (one-shot): ${result.signOutTokens}`);
console.log(`  confirmation tokens (one-shot): ${result.confirmationTokens}`);
console.log(`  reset tokens (one-shot): ${result.resetTokens}`);
console.log(`\nSeed file: ${relative(ROOT, SEED_FILE)}`);
console.log("Profiles smoke, load and stress are ready.");
