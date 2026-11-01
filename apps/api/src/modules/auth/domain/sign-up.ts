import { isValidEmail } from "./email";

export const PASSWORD_MIN_LENGTH = 8;
export const NAME_MAX_LENGTH = 100;

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface SignUpFieldError {
  field: string;
  messages: string[];
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Server-side mirror of the sign-up form rules. Both the DTO and the use case
 * rely on it so the browser and the API cannot drift apart.
 */
export function validateSignUpInput(input: SignUpInput): SignUpFieldError[] {
  const errors: SignUpFieldError[] = [];

  if (isBlank(input.firstName)) {
    errors.push({ field: "firstName", messages: ["First name is required"] });
  } else if (input.firstName.trim().length > NAME_MAX_LENGTH) {
    errors.push({
      field: "firstName",
      messages: [`First name must be at most ${NAME_MAX_LENGTH} characters`],
    });
  }

  if (isBlank(input.lastName)) {
    errors.push({ field: "lastName", messages: ["Last name is required"] });
  } else if (input.lastName.trim().length > NAME_MAX_LENGTH) {
    errors.push({
      field: "lastName",
      messages: [`Last name must be at most ${NAME_MAX_LENGTH} characters`],
    });
  }

  if (!isValidEmail(input.email.trim())) {
    errors.push({
      field: "email",
      messages: ["Enter a valid email address"],
    });
  }

  if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.push({
      field: "password",
      messages: [`Password must be at least ${PASSWORD_MIN_LENGTH} characters`],
    });
  }

  if (input.password !== input.passwordConfirmation) {
    errors.push({
      field: "passwordConfirmation",
      messages: ["Passwords do not match"],
    });
  }

  return errors;
}
