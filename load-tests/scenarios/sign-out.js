import exec from "k6/execution";
import { check } from "k6";

import { at } from "../lib/data.js";
import { bearer, post } from "../lib/http.js";
import { seed } from "../state.js";

export function signOut() {
  const token = at(
    seed.signOutTokens,
    exec.scenario.iterationInTest,
    "signOutTokens",
  );

  const response = post(
    "/api/v1/auth/sign-out",
    {},
    {
      tags: { endpoint: "sign_out" },
      headers: bearer(token),
    },
  );

  check(response, {
    "sign-out: status is 204": (result) => result.status === 204,
  });
}
