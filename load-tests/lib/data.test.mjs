import assert from "node:assert/strict";
import test from "node:test";

import {
  SEED_VERSION,
  buildOptions,
  maxIterationsFor,
  requiredSeedCounts,
  resolveProfile,
  scenarioRatePerMinute,
} from "./config.js";
import { at, pick, signUpEmail, validateSeed } from "./data.js";

function validSeed() {
  return {
    version: SEED_VERSION,
    password: "password123",
    resetPassword: "password456",
    signInEmails: ["signin@loadtest.local"],
    forgotPasswordEmails: ["forgot@loadtest.local"],
    sessionTokens: ["session-token"],
    signOutTokens: ["sign-out-token"],
    confirmationTokens: ["confirmation-token"],
    resetTokens: ["reset-token"],
  };
}

const SMALL_REQUIREMENTS = {
  signInEmails: 1,
  forgotPasswordEmails: 1,
  sessionTokens: 1,
  signOutTokens: 1,
  confirmationTokens: 1,
  resetTokens: 1,
};

test("pick cycles through a reusable pool", () => {
  const pool = ["a", "b"];

  assert.equal(pick(pool, 0, "pool"), "a");
  assert.equal(pick(pool, 1, "pool"), "b");
  assert.equal(pick(pool, 2, "pool"), "a");
});

test("pick rejects an empty pool with the seed hint", () => {
  assert.throws(
    () => pick([], 0, "signInEmails"),
    /signInEmails is empty.*loadtest:seed/,
  );
});

test("at returns a one-shot entry without cycling", () => {
  assert.equal(at(["a", "b"], 0, "pool"), "a");
  assert.equal(at(["a", "b"], 1, "pool"), "b");
});

test("at fails when the one-shot pool is exhausted", () => {
  assert.throws(
    () => at(["a"], 1, "signOutTokens"),
    /signOutTokens is exhausted at index 1 \(size 1\).*loadtest:seed/,
  );
});

test("signUpEmail is unique per run, VU and iteration", () => {
  const first = signUpEmail("run", 1, 1, "loadtest.local");
  const second = signUpEmail("run", 2, 1, "loadtest.local");

  assert.equal(first, "k6-signup-run-1-1@loadtest.local");
  assert.notEqual(first, second);
});

test("validateSeed accepts a complete seed", () => {
  assert.deepEqual(validateSeed(validSeed(), SMALL_REQUIREMENTS), []);
});

test("validateSeed reports version, password and pool problems", () => {
  const seed = validSeed();
  seed.version = 99;
  seed.password = "short";
  seed.signOutTokens = [];

  const errors = validateSeed(seed, {
    ...SMALL_REQUIREMENTS,
    signOutTokens: 10,
  });

  assert.ok(errors.some((error) => error.includes("version")));
  assert.ok(errors.some((error) => error.includes("password")));
  assert.ok(errors.some((error) => error.includes("signOutTokens has 0")));
});

test("resolveProfile accepts known profiles and rejects the rest", () => {
  assert.equal(resolveProfile("smoke"), "smoke");
  assert.equal(resolveProfile("load"), "load");
  assert.equal(resolveProfile("stress"), "stress");
  assert.throws(() => resolveProfile("turbo"), /Unknown PROFILE/);
});

test("smoke uses 10% of the load rate with a minimum of one", () => {
  assert.equal(scenarioRatePerMinute("smoke", "health"), 120);
  assert.equal(scenarioRatePerMinute("smoke", "sign_up"), 3);
  assert.equal(scenarioRatePerMinute("load", "sign_in"), 300);
});

test("load builds one constant-arrival-rate scenario per endpoint", () => {
  const options = buildOptions("load");

  assert.equal(Object.keys(options.scenarios).length, 9);
  assert.equal(options.scenarios.health.executor, "constant-arrival-rate");
  assert.equal(options.scenarios.health.duration, "9m");
  assert.equal(options.scenarios.sign_in.rate, 300);
  assert.equal(options.scenarios.sign_in.exec, "signIn");
});

test("stress ramps every scenario up to 3x the load rate", () => {
  const options = buildOptions("stress");
  const signIn = options.scenarios.sign_in;

  assert.equal(signIn.executor, "ramping-arrival-rate");
  assert.equal(signIn.startRate, 150);
  assert.equal(signIn.stages.length, 5);
  assert.equal(Math.max(...signIn.stages.map((stage) => stage.target)), 900);
  assert.equal(options.scenarios.health.stages.at(-1).target, 1_200);
});

test("one-shot requirements cover stress with a graceful-stop margin", () => {
  const requirements = requiredSeedCounts("stress");

  assert.ok(requirements.signOutTokens >= 5_580);
  assert.ok(requirements.confirmationTokens >= 5_580);
  assert.ok(requirements.resetTokens >= 2_790);
  assert.ok(
    maxIterationsFor("stress", "sign_out") >=
      maxIterationsFor("load", "sign_out"),
  );
});
