import { check } from "k6";

import { get } from "../lib/http.js";

export function health() {
  const response = get("/health", { tags: { endpoint: "health" } });

  check(response, {
    "health: status is 200": (result) => result.status === 200,
    "health: status is ok": (result) => result.json("status") === "ok",
  });
}
