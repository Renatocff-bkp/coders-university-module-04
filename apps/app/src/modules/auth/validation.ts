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

export function validateEmail(email: string): string | undefined {
  return EMAIL_PATTERN.test(email.trim())
    ? undefined
    : "Enter a valid email address.";
}

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

  const emailError = validateEmail(values.email);

  if (emailError) {
    errors.email = emailError;
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

export interface SignInFormValues {
  email: string;
  password: string;
}

export type SignInField = keyof SignInFormValues;

export type SignInFieldErrors = Partial<Record<SignInField, string>>;

export function validateSignInForm(
  values: SignInFormValues,
): SignInFieldErrors {
  const errors: SignInFieldErrors = {};

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (values.password.length === 0) {
    errors.password = "Password is required.";
  }

  return errors;
}
