import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { flattenValidationErrors } from "../../../../shared/http/validation";
import { ConfirmAccountDto } from "./confirm-account.dto";

async function invalidFields(
  payload: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(ConfirmAccountDto, payload);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  return flattenValidationErrors(errors).map((error) => error.field);
}

describe("ConfirmAccountDto", () => {
  it("accepts a token", async () => {
    expect(await invalidFields({ token: "abc123" })).toEqual([]);
  });

  it("requires the token", async () => {
    expect(await invalidFields({})).toContain("token");
  });

  it("rejects a blank token after trimming", async () => {
    expect(await invalidFields({ token: "   " })).toContain("token");
  });

  it("rejects tokens longer than 512 characters", async () => {
    expect(await invalidFields({ token: "a".repeat(513) })).toContain("token");
  });

  it("rejects unknown fields", async () => {
    expect(await invalidFields({ token: "abc123", userId: "x" })).toContain(
      "userId",
    );
  });

  it("trims the token", async () => {
    const dto = plainToInstance(ConfirmAccountDto, { token: "  abc123  " });

    expect(dto.token).toBe("abc123");
  });
});
