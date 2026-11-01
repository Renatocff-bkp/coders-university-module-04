import http from "k6/http";

import { HTTP_TIMEOUT, resolveApiUrl } from "./config.js";

const BASE_URL = resolveApiUrl();

export function get(path, { tags = {}, headers = {} } = {}) {
  return http.get(`${BASE_URL}${path}`, {
    headers,
    tags,
    timeout: HTTP_TIMEOUT,
    redirects: 0,
  });
}

export function post(path, body, { tags = {}, headers = {} } = {}) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body ?? {}), {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    tags,
    timeout: HTTP_TIMEOUT,
    redirects: 0,
  });
}

export function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}
