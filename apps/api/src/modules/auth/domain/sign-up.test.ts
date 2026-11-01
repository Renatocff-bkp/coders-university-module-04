import { describe, expect, it } from "vitest";

import { PASSWORD_MIN_LENGTH, validateSignUpInput } from "./sign-up";

const VALID_INPUT = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "correct-horse",
  passwordConfirmation: "correct-horse",
};

function fieldsFor(overrides: Partial<typeof VALID_INPUT>): string[] {
  return validateSignUpInput({ ...VALID_INPUT, ...overrides }).map(
    (error) => error.field,
  );
}

describe("validateSignUpInput", () => {
  it("accepts a complete payload", () => {
    expect(validateSignUpInput(VALID_INPUT)).toEqual([]);
  });

  it("requires first and last name", () => {
    expect(fieldsFor({ firstName: "   " })).toContain("firstName");
    expect(fieldsFor({ lastName: "" })).toContain("lastName");
  });

  it("rejects malformed emails", () => {
    expect(fieldsFor({ email: "ada@example" })).toContain("email");
    expect(fieldsFor({ email: "ada example.com" })).toContain("email");
  });

  it("enforces the minimum password length", () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);

    expect(
      fieldsFor({ password: short, passwordConfirmation: short }),
    ).toContain("password");
  });

  it("requires matching password confirmation", () => {
    const errors = validateSignUpInput({
      ...VALID_INPUT,
      passwordConfirmation: "different-password",
    });

    expect(errors).toEqual([
      { field: "passwordConfirmation", messages: ["Passwords do not match"] },
    ]);
  });

  it("enforces the name length limit", () => {
    expect(fieldsFor({ firstName: "a".repeat(101) })).toContain("firstName");
  });
});
