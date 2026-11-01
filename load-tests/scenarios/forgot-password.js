import exec from "k6/execution";
import { check } from "k6";

import { pick } from "../lib/data.js";
import { post } from "../lib/http.js";
import { seed } from "../state.js";

export function forgotPassword() {
  const email = pick(
    seed.forgotPasswordEmails,
    exec.scenario.iterationInTest,
    "forgotPasswordEmails",
  );

  const response = post(
    "/api/v1/auth/forgot-password",
    { email },
    { tags: { endpoint: "forgot_password" } },
  );

  check(response, {
    "forgot-password: status is 202": (result) => result.status === 202,
    "forgot-password: returns a message": (result) =>
      typeof result.json("message") === "string",
  });
}
