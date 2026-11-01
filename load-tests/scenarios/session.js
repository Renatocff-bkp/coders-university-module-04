import exec from "k6/execution";
import { check } from "k6";

import { pick } from "../lib/data.js";
import { bearer, get } from "../lib/http.js";
import { seed } from "../state.js";

export function session() {
  const token = pick(
    seed.sessionTokens,
    exec.scenario.iterationInTest,
    "sessionTokens",
  );

  const response = get("/api/v1/auth/session", {
    tags: { endpoint: "session" },
    headers: bearer(token),
  });

  check(response, {
    "session: status is 200": (result) => result.status === 200,
    "session: returns the user": (result) =>
      typeof result.json("user.email") === "string",
  });
}
