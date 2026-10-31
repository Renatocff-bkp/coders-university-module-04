import { describe, expect, it } from "vitest";

import {
  firstInvalidField,
  PASSWORD_MIN_LENGTH,
  validateSignUpForm,
} from "./validation";

const VALID_VALUES = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "correct-horse",
  passwordConfirmation: "correct-horse",
};

describe("validateSignUpForm", () => {
  it("accepts a complete form", () => {
    expect(validateSignUpForm(VALID_VALUES)).toEqual({});
  });

  it("requires both names", () => {
    const errors = validateSignUpForm({
      ...VALID_VALUES,
      firstName: " ",
      lastName: "",
    });

    expect(errors.firstName).toBe("First name is required.");
    expect(errors.lastName).toBe("Last name is required.");
  });

  it("rejects malformed emails", () => {
    expect(
      validateSignUpForm({ ...VALID_VALUES, email: "ada@example" }).email,
    ).toBe("Enter a valid email address.");
  });

  it("enforces the minimum password length", () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);

    expect(
      validateSignUpForm({
        ...VALID_VALUES,
        password: short,
        passwordConfirmation: short,
      }).password,
    ).toBe(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  });

  it("requires matching password confirmation", () => {
    expect(
      validateSignUpForm({
        ...VALID_VALUES,
        passwordConfirmation: "different-password",
      }).passwordConfirmation,
    ).toBe("Passwords do not match.");
  });

  it("reports the first invalid field in form order", () => {
    expect(
      firstInvalidField({
        passwordConfirmation: "Passwords do not match.",
        firstName: "First name is required.",
      }),
    ).toBe("firstName");
    expect(firstInvalidField({})).toBeNull();
  });
});
