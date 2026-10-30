import { Writable } from "node:stream";

const lines: string[] = [];

/**
 * Test-only destination used instead of stdout. It keeps assertions on log
 * context deterministic and prevents noisy output from the suite.
 */
export const testLogStream = new Writable({
  write(chunk: Buffer | string, _encoding, callback) {
    lines.push(chunk.toString());
    callback();
  },
});

export function clearTestLogs(): void {
  lines.length = 0;
}

export function readTestLogs(): Record<string, unknown>[] {
  return lines.flatMap((chunk) =>
    chunk
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>),
  );
}
