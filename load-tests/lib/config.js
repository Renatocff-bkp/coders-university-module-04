/**
 * Pure configuration for the k6 suite.
 *
 * This module is imported by k6 (init context), by the seed script (Node) and
 * by unit tests. It must not import k6 modules or touch the filesystem.
 */

const ENV = typeof __ENV !== "undefined" ? __ENV : {};

export const DEFAULT_API_URL = "http://localhost:3002";
export const HTTP_TIMEOUT = "30s";
export const SEED_VERSION = 1;

export const SEED = {
  emailDomain: "loadtest.local",
  emailPrefix: "k6",
  password: "loadtest-password-123",
  resetPassword: "loadtest-password-456",
  counts: {
    signInUsers: 100,
    forgotPasswordUsers: 100,
    sessionUsers: 25,
    sessionTokens: 500,
    signOutUsers: 100,
    signOutTokens: 10_000,
    confirmationTokens: 10_000,
    resetTokens: 5_000,
  },
};

/**
 * Load profile in iterations per minute. The other profiles are derived from
 * it: smoke uses 10% and stress ramps up to 3x.
 */
export const LOAD_RATES_PER_MINUTE = {
  health: 1_200,
  ping: 2_400,
  sign_up: 30,
  confirm_account: 120,
  sign_in: 300,
  session: 1_800,
  sign_out: 120,
  forgot_password: 30,
  reset_password: 60,
};

export const PROFILE_DURATIONS = {
  smoke: "30s",
  load: "9m",
};

export const PROFILE_DURATION_SECONDS = {
  smoke: 30,
  load: 540,
};

export const SMOKE_FACTOR = 0.1;

/**
 * Stress starts at 50% of the load rate, climbs to 3x and recovers to 100%.
 * Each stage applies to every scenario independently.
 */
export const STRESS_STAGES = [
  { duration: "1m", factor: 0.5 },
  { duration: "2m", factor: 1 },
  { duration: "5m", factor: 2 },
  { duration: "4m", factor: 3 },
  { duration: "3m", factor: 1 },
];

export const GRACEFUL_STOP_SECONDS = 30;
export const SEED_HEADROOM = 1.1;

const EXEC_NAMES = {
  health: "health",
  ping: "ping",
  sign_up: "signUp",
  confirm_account: "confirmAccount",
  sign_in: "signIn",
  session: "session",
  sign_out: "signOut",
  forgot_password: "forgotPassword",
  reset_password: "resetPassword",
};

const VU_CONFIG = {
  health: { preAllocatedVUs: 5, maxVUs: 100 },
  ping: { preAllocatedVUs: 5, maxVUs: 100 },
  sign_up: { preAllocatedVUs: 5, maxVUs: 50 },
  confirm_account: { preAllocatedVUs: 10, maxVUs: 100 },
  sign_in: { preAllocatedVUs: 20, maxVUs: 200 },
  session: { preAllocatedVUs: 15, maxVUs: 150 },
  sign_out: { preAllocatedVUs: 10, maxVUs: 100 },
  forgot_password: { preAllocatedVUs: 5, maxVUs: 50 },
  reset_password: { preAllocatedVUs: 10, maxVUs: 100 },
};

const PROFILES = ["smoke", "load", "stress"];

export function resolveApiUrl() {
  return (ENV.API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");
}

export function resolveProfile(value = ENV.PROFILE) {
  const profile = value ?? "smoke";

  if (!PROFILES.includes(profile)) {
    throw new Error(
      `Unknown PROFILE "${profile}". Use one of: ${PROFILES.join(", ")}.`,
    );
  }

  return profile;
}

export function scenarioRatePerMinute(profile, scenario) {
  const baseRate = LOAD_RATES_PER_MINUTE[scenario];

  if (baseRate === undefined) {
    throw new Error(`Unknown scenario "${scenario}".`);
  }

  if (profile === "smoke") {
    return Math.max(1, Math.round(baseRate * SMOKE_FACTOR));
  }

  return baseRate;
}

function durationToSeconds(value) {
  if (value.endsWith("s")) {
    return Number(value.slice(0, -1));
  }

  if (value.endsWith("m")) {
    return Number(value.slice(0, -1)) * 60;
  }

  throw new Error(`Unsupported duration "${value}".`);
}

function maxRateFor(profile, scenario) {
  if (profile !== "stress") {
    return scenarioRatePerMinute(profile, scenario);
  }

  return Math.max(
    ...STRESS_STAGES.map((stage) =>
      Math.max(1, Math.round(LOAD_RATES_PER_MINUTE[scenario] * stage.factor)),
    ),
  );
}

function durationFor(profile) {
  if (profile !== "stress") {
    return PROFILE_DURATION_SECONDS[profile];
  }

  return STRESS_STAGES.reduce(
    (total, stage) => total + durationToSeconds(stage.duration),
    0,
  );
}

/**
 * Upper bound for the number of iterations a scenario can start in a profile,
 * including the graceful stop and a 10% margin.
 */
export function maxIterationsFor(profile, scenario) {
  const rate = maxRateFor(profile, scenario);
  const seconds = durationFor(profile) + GRACEFUL_STOP_SECONDS;

  return Math.ceil((rate / 60) * seconds * SEED_HEADROOM);
}

/**
 * Minimum seed pool sizes for a profile. Only one-shot pools are constrained;
 * reusable pools just need at least one entry.
 */
export function requiredSeedCounts(profile) {
  return {
    signInEmails: 1,
    forgotPasswordEmails: 1,
    sessionTokens: 1,
    signOutTokens: maxIterationsFor(profile, "sign_out"),
    confirmationTokens: maxIterationsFor(profile, "confirm_account"),
    resetTokens: maxIterationsFor(profile, "reset_password"),
  };
}

function thresholdsFor(profile) {
  if (profile === "smoke") {
    return {
      checks: ["rate>0.99"],
      http_req_failed: ["rate<0.01"],
      http_req_duration: ["p(95)<1000"],
    };
  }

  if (profile === "load") {
    return {
      checks: ["rate>0.95"],
      http_req_failed: ["rate<0.05"],
    };
  }

  return {
    checks: ["rate>0.80"],
    http_req_failed: ["rate<0.20"],
  };
}

function scenarioOptions(profile, scenario) {
  const vus = VU_CONFIG[scenario];
  const common = {
    exec: EXEC_NAMES[scenario],
    timeUnit: "1m",
    preAllocatedVUs: vus.preAllocatedVUs,
    maxVUs: vus.maxVUs,
    gracefulStop: "30s",
  };

  if (profile === "stress") {
    const stages = STRESS_STAGES.map((stage) => ({
      duration: stage.duration,
      target: Math.max(
        1,
        Math.round(LOAD_RATES_PER_MINUTE[scenario] * stage.factor),
      ),
    }));

    return {
      ...common,
      executor: "ramping-arrival-rate",
      startRate: stages[0].target,
      stages,
    };
  }

  return {
    ...common,
    executor: "constant-arrival-rate",
    rate: scenarioRatePerMinute(profile, scenario),
    duration: PROFILE_DURATIONS[profile],
  };
}

export function buildOptions(profile) {
  const scenarios = {};

  for (const scenario of Object.keys(LOAD_RATES_PER_MINUTE)) {
    scenarios[scenario] = scenarioOptions(profile, scenario);
  }

  return {
    scenarios,
    thresholds: thresholdsFor(profile),
    summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
    userAgent: "k6-coders-university-loadtest/1.0",
    tags: {
      suite: "coders-university-loadtest",
      profile,
    },
    discardResponseBodies: false,
  };
}
