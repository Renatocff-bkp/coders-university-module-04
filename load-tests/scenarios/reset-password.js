import exec from "k6/execution";
import { check } from "k6";

import { at } from "../lib/data.js";
import { post } from "../lib/http.js";
import { seed } from "../state.js";

export function resetPassword() {
  const token = at(
    seed.resetTokens,
    exec.scenario.iterationInTest,
    "resetTokens",
  );

  const response = post(
    "/api/v1/auth/reset-password",
    {
      token,
      password: seed.resetPassword,
      passwordConfirmation: seed.resetPassword,
    },
    { tags: { endpoint: "reset_password" } },
  );

  check(response, {
    "reset-password: status is 204": (result) => result.status === 204,
  });
}
