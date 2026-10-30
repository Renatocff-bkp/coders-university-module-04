import { describe, expect, it } from "vitest";

import { BcryptPasswordHasher } from "./bcrypt-password-hasher";
import { CryptoTokenGenerator } from "./crypto-token-generator";

const BCRYPT_COST_12 = /^\$2[aby]\$12\$/;

describe("BcryptPasswordHasher", () => {
  const hasher = new BcryptPasswordHasher();

  it("hashes with Bcrypt cost 12 and verifies the password", async () => {
    const hash = await hasher.hash("correct horse battery staple");

    expect(hash).toMatch(BCRYPT_COST_12);
    expect(hash).not.toContain("correct horse battery staple");
    await expect(
      hasher.verify("correct horse battery staple", hash),
    ).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hasher.hash("correct horse battery staple");

    await expect(hasher.verify("wrong password", hash)).resolves.toBe(false);
  });

  it("uses a unique salt per hash", async () => {
    const first = await hasher.hash("same password");
    const second = await hasher.hash("same password");

    expect(first).not.toBe(second);
  });
});

describe("CryptoTokenGenerator", () => {
  const generator = new CryptoTokenGenerator();

  it("generates 32-byte base64url tokens without padding", () => {
    const token = generator.generate();

    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toContain("=");
  });

  it("generates distinct tokens", () => {
    expect(generator.generate()).not.toBe(generator.generate());
  });

  it("hashes tokens with SHA-256", () => {
    expect(generator.hash("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(generator.hash("abc")).toBe(generator.hash("abc"));
  });
});
