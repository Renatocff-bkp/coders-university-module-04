import exec from "k6/execution";
import { check } from "k6";

import { at } from "../lib/data.js";
import { post } from "../lib/http.js";
import { seed } from "../state.js";

export function confirmAccount() {
  const token = at(
    seed.confirmationTokens,
    exec.scenario.iterationInTest,
    "confirmationTokens",
  );

  const response = post(
    "/api/v1/auth/confirm-account",
    { token },
    { tags: { endpoint: "confirm_account" } },
  );

  check(response, {
    "confirm-account: status is 200": (result) => result.status === 200,
    "confirm-account: returns a session token": (result) =>
      typeof result.json("token") === "string",
  });
}
