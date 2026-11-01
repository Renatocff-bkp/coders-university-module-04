import { describe, expect, it } from "vitest";

import {
  firstInvalidField,
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateResetPasswordForm,
  validateSignInForm,
  validateSignUpForm,
} from "./validation";

describe("validateEmail", () => {
  it("accepts a well-formed address, ignoring surrounding spaces", () => {
    expect(validateEmail("  ada@example.com ")).toBeUndefined();
  });

  it("rejects an empty or malformed address", () => {
    expect(validateEmail("")).toBe("Enter a valid email address.");
    expect(validateEmail("ada@example")).toBe("Enter a valid email address.");
  });
});

const VALID_VALUES = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "correct-horse",
  passwordConfirmation: "correct-horse",
};

describe("validateSignInForm", () => {
  it("accepts an e-mail and a password", () => {
    expect(
      validateSignInForm({ email: "ada@example.com", password: "x" }),
    ).toEqual({});
  });

  it("does not apply the sign-up password policy", () => {
    expect(
      validateSignInForm({ email: "ada@example.com", password: "abc" }),
    ).toEqual({});
  });

  it("requires a valid e-mail and a password", () => {
    const errors = validateSignInForm({ email: " ", password: "" });

    expect(errors.email).toBe("Enter a valid email address.");
    expect(errors.password).toBe("Password is required.");
  });
});

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

describe("validateResetPasswordForm", () => {
  it("accepts matching passwords that meet the minimum length", () => {
    expect(
      validateResetPasswordForm({
        password: "correct-horse",
        passwordConfirmation: "correct-horse",
      }),
    ).toEqual({});
  });

  it("enforces the minimum password length", () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);

    expect(
      validateResetPasswordForm({
        password: short,
        passwordConfirmation: short,
      }).password,
    ).toBe(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  });

  it("requires the confirmation to match the password", () => {
    expect(
      validateResetPasswordForm({
        password: "correct-horse",
        passwordConfirmation: "correct-hors",
      }).passwordConfirmation,
    ).toBe("Passwords do not match.");
  });
});
