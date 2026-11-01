import { describe, expect, it } from "vitest";

import { GetSessionUseCase } from "./get-session.use-case";
import { SessionUserNotFoundError } from "../domain/errors";
import { InMemoryAuthUserRepository } from "../testing/in-memory-repositories";

describe("GetSessionUseCase", () => {
  it("returns the public user when the user exists", async () => {
    const users = new InMemoryAuthUserRepository();
    const user = await users.create({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      passwordHash: "hashed-password",
    });

    const useCase = new GetSessionUseCase(users);

    const result = await useCase.execute({ userId: user.id });

    expect(result.user).toMatchObject({
      id: user.id,
      email: "ada@example.com",
    });
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("throws a domain error when the user does not exist", async () => {
    const users = new InMemoryAuthUserRepository();
    const useCase = new GetSessionUseCase(users);

    await expect(
      useCase.execute({ userId: "missing-user" }),
    ).rejects.toBeInstanceOf(SessionUserNotFoundError);
  });
});