import { SharedArray } from "k6/data";

const env = typeof __ENV !== "undefined" ? __ENV : {};

/**
 * Loaded once in the init context and shared between all VUs. The path is
 * relative to this file, so it resolves to load-tests/.data/seed.json both
 * locally and inside the container mounted at /scripts.
 */
export const seed = new SharedArray("k6-seed", () => [
  JSON.parse(open("./.data/seed.json")),
])[0];

export const runId =
  typeof env.K6_RUN_ID === "string" && env.K6_RUN_ID.length > 0
    ? env.K6_RUN_ID
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
