import { SEED_VERSION } from "./config.js";

const SEED_HINT =
  'Run "npm run loadtest:seed" before starting the test, then try again.';

/**
 * Picks an entry from a reusable pool, cycling when the index exceeds the pool.
 */
export function pick(list, index, label) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`${label} is empty. ${SEED_HINT}`);
  }

  return list[index % list.length];
}

/**
 * Picks an entry from a one-shot pool. Reusing an entry would make the request
 * fail later, so an exhausted pool is an error instead of a cycle.
 */
export function at(list, index, label) {
  if (!Array.isArray(list)) {
    throw new Error(`${label} is missing from the seed file. ${SEED_HINT}`);
  }

  if (index < 0 || index >= list.length) {
    throw new Error(
      `${label} is exhausted at index ${index} (size ${list.length}). ${SEED_HINT}`,
    );
  }

  return list[index];
}

/**
 * Builds an e-mail that is unique per VU and iteration, forcing sign-up to
 * create a user instead of resending a confirmation for an existing account.
 */
export function signUpEmail(runId, vuId, iteration, domain) {
  return `k6-signup-${runId}-${vuId}-${iteration}@${domain}`;
}

/**
 * Returns a list of human-readable problems. An empty list means the seed is
 * ready for the profile requirements.
 */
export function validateSeed(seed, requirements) {
  const errors = [];

  if (!seed || typeof seed !== "object") {
    return ["seed file is empty or invalid"];
  }

  if (seed.version !== SEED_VERSION) {
    errors.push(
      `version is ${String(seed.version)}, expected ${SEED_VERSION}; reseed`,
    );
  }

  if (typeof seed.password !== "string" || seed.password.length < 8) {
    errors.push("password is missing or shorter than 8 characters");
  }

  if (typeof seed.resetPassword !== "string" || seed.resetPassword.length < 8) {
    errors.push("resetPassword is missing or shorter than 8 characters");
  }

  for (const [key, minimum] of Object.entries(requirements)) {
    const value = seed[key];

    if (!Array.isArray(value)) {
      errors.push(`${key} is missing or not an array`);
      continue;
    }

    if (value.length < minimum) {
      errors.push(`${key} has ${value.length}, needs at least ${minimum}`);
    }
  }

  return errors;
}
