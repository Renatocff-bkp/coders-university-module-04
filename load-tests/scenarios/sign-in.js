import exec from "k6/execution";
import { check } from "k6";

import { pick } from "../lib/data.js";
import { post } from "../lib/http.js";
import { seed } from "../state.js";

export function signIn() {
  const email = pick(
    seed.signInEmails,
    exec.scenario.iterationInTest,
    "signInEmails",
  );

  const response = post(
    "/api/v1/auth/sign-in",
    { email, password: seed.password },
    { tags: { endpoint: "sign_in" } },
  );

  check(response, {
    "sign-in: status is 200": (result) => result.status === 200,
    "sign-in: returns a session token": (result) =>
      typeof result.json("token") === "string",
  });
}
