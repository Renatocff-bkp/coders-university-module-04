import { beforeEach, describe, expect, it } from "vitest";

import { InvalidTokenError } from "../domain/errors";
import { FakeEmailService } from "../testing/fake-email.service";
import {
  FixedClock,
  InMemoryAuthSessionRepository,
  InMemoryAuthUserRepository,
  SequentialTokenGenerator,
} from "../testing/in-memory-repositories";
import { SessionService } from "./session.service";
import { SignOutUseCase } from "./sign-out.use-case";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("SignOutUseCase", () => {
  let sessions: InMemoryAuthSessionRepository;
  let sessionService: SessionService;
  let useCase: SignOutUseCase;

  beforeEach(() => {
    sessions = new InMemoryAuthSessionRepository();
    sessionService = new SessionService(
      sessions,
      new SequentialTokenGenerator(),
      new FixedClock(NOW),
      new InMemoryAuthUserRepository(),
      new FakeEmailService(),
    );
    useCase = new SignOutUseCase(sessionService);
  });

  it("revokes the current session so its token no longer validates", async () => {
    const created = await sessionService.create({ userId: "user-1" });

    await useCase.execute({ token: created.token, userId: "user-1" });

    expect(sessions.sessions[0]?.revokedAt).toEqual(NOW);
    expect(await sessionService.validate(created.token)).toBeNull();
  });

  it("keeps the sessions of other users untouched", async () => {
    const other = await sessionService.create({ userId: "user-2" });
    const current = await sessionService.create({ userId: "user-1" });

    await useCase.execute({ token: current.token, userId: "user-1" });

    expect(await sessionService.validate(other.token)).toBe("user-2");
  });

  it("rejects an unknown token", async () => {
    await expect(
      useCase.execute({ token: "unknown", userId: "user-1" }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
