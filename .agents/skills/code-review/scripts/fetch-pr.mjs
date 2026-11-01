#!/usr/bin/env node
// Fetches a GitHub pull request's metadata, files and diff.
// Usage: node fetch-pr.mjs <pr-url>
// Env: GITHUB_TOKEN or GH_TOKEN

const url = process.argv[2];
if (!url) {
  console.error("Usage: fetch-pr.mjs <pr-url>");
  process.exit(1);
}

const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
if (!m) {
  console.error("Invalid PR URL. Expected https://github.com/{owner}/{repo}/pull/{number}");
  process.exit(1);
}
const [, owner, repo, number] = m;

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "code-review-skill",
};
if (token) headers.Authorization = `Bearer ${token}`;

async function gh(path, accept) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { ...headers, ...(accept ? { Accept: accept } : {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${text}`);
  }
  return res;
}

try {
  const prRes = await gh(`/repos/${owner}/${repo}/pulls/${number}`);
  const pr = await prRes.json();

  // Paginate files
  const files = [];
  let page = 1;
  while (true) {
    const res = await gh(`/repos/${owner}/${repo}/pulls/${number}/files?per_page=100&page=${page}`);
    const batch = await res.json();
    files.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  const diffRes = await gh(`/repos/${owner}/${repo}/pulls/${number}`, "application/vnd.github.v3.diff");
  const diff = await diffRes.text();

  const out = { owner, repo, number: Number(number), pr, files, diff };
  console.log(JSON.stringify(out));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
