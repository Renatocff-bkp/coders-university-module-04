import { check } from "k6";

import { get } from "../lib/http.js";

export function ping() {
  const response = get("/api/v1/ping", { tags: { endpoint: "ping" } });

  check(response, {
    "ping: status is 200": (result) => result.status === 200,
    "ping: message is pong": (result) => result.json("message") === "pong",
  });
}
