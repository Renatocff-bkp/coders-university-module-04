#!/usr/bin/env node
// Posts a pull request review (with inline comments) to GitHub.
// Usage: node post-review.mjs <pr-url> <payload.json>
// Env: GITHUB_TOKEN or GH_TOKEN
// payload.json shape:
// { "commit_id"?: string, "body": string, "event": "APPROVE"|"REQUEST_CHANGES", "comments": [{"path","line","side"?, "body"}] }

const url = process.argv[2];
const payloadPath = process.argv[3];
if (!url || !payloadPath) {
  console.error("Usage: post-review.mjs <pr-url> <payload.json>");
  process.exit(1);
}

const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
if (!m) {
  console.error(
    "Invalid PR URL. Expected https://github.com/{owner}/{repo}/pull/{number}",
  );
  process.exit(1);
}
const [, owner, repo, number] = m;

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.error("GITHUB_TOKEN (or GH_TOKEN) is required to post a review.");
  process.exit(1);
}

const fs = await import("node:fs/promises");
let payload;
try {
  payload = JSON.parse(await fs.readFile(payloadPath, "utf8"));
} catch (err) {
  console.error("Failed to read payload JSON:", err.message);
  process.exit(1);
}

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "code-review-skill",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

// Fetch head sha if commit_id not provided
if (!payload.commit_id) {
  const prRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
    { headers },
  );
  if (!prRes.ok) {
    console.error(`Failed to fetch PR: ${prRes.status} ${prRes.statusText}`);
    process.exit(1);
  }
  const pr = await prRes.json();
  payload.commit_id = pr.head.sha;
}

const body = {
  commit_id: payload.commit_id,
  body: payload.body || "",
  event: payload.event,
  comments: (payload.comments || []).map((c) => ({
    path: c.path,
    line: c.line,
    side: c.side || "RIGHT",
    body: c.body,
  })),
};

const res = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`,
  {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  },
);

const text = await res.text();
if (!res.ok) {
  console.error(`GitHub API ${res.status} ${res.statusText}: ${text}`);
  process.exit(1);
}
const data = JSON.parse(text);
console.log(
  JSON.stringify(
    { id: data.id, state: data.state, html_url: data.html_url },
    null,
    2,
  ),
);
