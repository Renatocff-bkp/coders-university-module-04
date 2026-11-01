import { beforeEach, describe, expect, it } from "vitest";

import { EMAIL_CONFIRMATION_TTL_MS } from "../domain/auth-token";
import { InvalidTokenError } from "../domain/errors";
import {
  FixedClock,
  InMemoryAuthTokenRepository,
  SequentialTokenGenerator,
} from "../testing/in-memory-repositories";
import { OneTimeTokenService } from "./one-time-token.service";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("OneTimeTokenService", () => {
  let clock: FixedClock;
  let repository: InMemoryAuthTokenRepository;
  let generator: SequentialTokenGenerator;
  let service: OneTimeTokenService;

  beforeEach(() => {
    clock = new FixedClock(NOW);
    repository = new InMemoryAuthTokenRepository();
    generator = new SequentialTokenGenerator();
    service = new OneTimeTokenService(repository, generator, clock);
  });

  it("issues a token persisting only its hash", async () => {
    const issued = await service.issue(
      "user-1",
      "email_confirmation",
      EMAIL_CONFIRMATION_TTL_MS,
    );

    expect(issued.token).toBe("token-1");
    expect(issued.tokenId).toBe(repository.tokens[0]?.id);
    expect(issued.expiresAt).toEqual(
      new Date(NOW.getTime() + EMAIL_CONFIRMATION_TTL_MS),
    );
    expect(repository.tokens[0]).toMatchObject({
      userId: "user-1",
      type: "email_confirmation",
      tokenHash: "hashed:token-1",
      usedAt: null,
    });
  });

  it("consumes a token exactly once", async () => {
    const issued = await service.issue(
      "user-1",
      "email_confirmation",
      EMAIL_CONFIRMATION_TTL_MS,
    );

    const consumed = await service.consume(issued.token, "email_confirmation");

    expect(consumed.usedAt).toEqual(NOW);
    expect(repository.tokens[0]?.usedAt).toEqual(NOW);
    await expect(
      service.consume(issued.token, "email_confirmation"),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects a token of another type", async () => {
    const issued = await service.issue(
      "user-1",
      "email_confirmation",
      EMAIL_CONFIRMATION_TTL_MS,
    );

    await expect(
      service.consume(issued.token, "password_reset"),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects an expired token", async () => {
    const issued = await service.issue(
      "user-1",
      "password_reset",
      EMAIL_CONFIRMATION_TTL_MS,
    );

    clock.advance(EMAIL_CONFIRMATION_TTL_MS);

    await expect(
      service.consume(issued.token, "password_reset"),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects unknown and empty tokens", async () => {
    await expect(
      service.consume("unknown", "password_reset"),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(service.consume("", "password_reset")).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });

  it("invalidates previous unused tokens of the same type", async () => {
    const first = await service.issue(
      "user-1",
      "email_confirmation",
      EMAIL_CONFIRMATION_TTL_MS,
    );
    const second = await service.issue(
      "user-1",
      "email_confirmation",
      EMAIL_CONFIRMATION_TTL_MS,
    );

    expect(repository.tokens[0]?.usedAt).toEqual(NOW);
    await expect(
      service.consume(first.token, "email_confirmation"),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(
      service.consume(second.token, "email_confirmation"),
    ).resolves.toMatchObject({ id: second.tokenId });
  });

  it("keeps tokens of other types usable when issuing a new one", async () => {
    const reset = await service.issue(
      "user-1",
      "password_reset",
      EMAIL_CONFIRMATION_TTL_MS,
    );

    await service.issue(
      "user-1",
      "email_confirmation",
      EMAIL_CONFIRMATION_TTL_MS,
    );

    await expect(
      service.consume(reset.token, "password_reset"),
    ).resolves.toMatchObject({ id: reset.tokenId });
  });
});
