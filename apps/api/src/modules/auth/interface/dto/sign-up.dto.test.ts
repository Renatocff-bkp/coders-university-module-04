import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { flattenValidationErrors } from "../../../../shared/http/validation";
import { SignUpDto } from "./sign-up.dto";

const VALID_PAYLOAD = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "correct-horse",
  passwordConfirmation: "correct-horse",
};

async function invalidFields(
  overrides: Partial<typeof VALID_PAYLOAD>,
): Promise<string[]> {
  const dto = plainToInstance(SignUpDto, {
    ...VALID_PAYLOAD,
    ...overrides,
  });
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  return flattenValidationErrors(errors).map((error) => error.field);
}

describe("SignUpDto", () => {
  it("accepts a complete payload", async () => {
    expect(await invalidFields({})).toEqual([]);
  });

  it("requires both names", async () => {
    expect(await invalidFields({ firstName: "", lastName: "   " })).toEqual(
      expect.arrayContaining(["firstName", "lastName"]),
    );
  });

  it("rejects malformed emails", async () => {
    expect(await invalidFields({ email: "ada@example" })).toContain("email");
  });

  it("enforces the minimum password length", async () => {
    expect(
      await invalidFields({ password: "short", passwordConfirmation: "short" }),
    ).toContain("password");
  });

  it("requires matching password confirmation", async () => {
    const dto = plainToInstance(SignUpDto, {
      ...VALID_PAYLOAD,
      passwordConfirmation: "different-password",
    });
    const errors = await validate(dto);

    expect(flattenValidationErrors(errors)).toEqual([
      { field: "passwordConfirmation", messages: ["Passwords do not match"] },
    ]);
  });

  it("trims the names and the email", async () => {
    const dto = plainToInstance(SignUpDto, {
      ...VALID_PAYLOAD,
      firstName: "  Ada ",
      lastName: " Lovelace  ",
      email: "  ada@example.com  ",
    });

    expect(dto.firstName).toBe("Ada");
    expect(dto.lastName).toBe("Lovelace");
    expect(dto.email).toBe("ada@example.com");
    expect(await validate(dto)).toEqual([]);
  });
});
