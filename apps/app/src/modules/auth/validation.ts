export const PASSWORD_MIN_LENGTH = 8;
export const NAME_MAX_LENGTH = 100;

export interface SignUpFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export type SignUpField = keyof SignUpFormValues;

export type SignUpFieldErrors = Partial<Record<SignUpField, string>>;

export const SIGN_UP_FIELD_ORDER: SignUpField[] = [
  "firstName",
  "lastName",
  "email",
  "password",
  "passwordConfirmation",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignUpForm(
  values: SignUpFormValues,
): SignUpFieldErrors {
  const errors: SignUpFieldErrors = {};

  if (values.firstName.trim().length === 0) {
    errors.firstName = "First name is required.";
  } else if (values.firstName.trim().length > NAME_MAX_LENGTH) {
    errors.firstName = `First name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  if (values.lastName.trim().length === 0) {
    errors.lastName = "Last name is required.";
  } else if (values.lastName.trim().length > NAME_MAX_LENGTH) {
    errors.lastName = `Last name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (values.password !== values.passwordConfirmation) {
    errors.passwordConfirmation = "Passwords do not match.";
  }

  return errors;
}

export function firstInvalidField(
  errors: SignUpFieldErrors,
): SignUpField | null {
  return (
    SIGN_UP_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null
  );
}
