import exec from "k6/execution";
import { check } from "k6";

import { SEED } from "../lib/config.js";
import { signUpEmail } from "../lib/data.js";
import { post } from "../lib/http.js";
import { runId } from "../state.js";

export function signUp() {
  const iteration = exec.scenario.iterationInTest;
  const email = signUpEmail(
    runId,
    exec.vu.idInTest,
    iteration,
    SEED.emailDomain,
  );

  const response = post(
    "/api/v1/auth/sign-up",
    {
      firstName: "Load",
      lastName: "Test",
      email,
      password: SEED.password,
      passwordConfirmation: SEED.password,
    },
    { tags: { endpoint: "sign_up" } },
  );

  check(response, {
    "sign-up: status is 202": (result) => result.status === 202,
    "sign-up: returns a message": (result) =>
      typeof result.json("message") === "string",
  });
}
