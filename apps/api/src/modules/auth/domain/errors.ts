export class InvalidTokenError extends Error {
  constructor() {
    super("Invalid or expired token");
    this.name = "InvalidTokenError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class EmailNotConfirmedError extends Error {
  constructor() {
    super("Email address is not confirmed");
    this.name = "EmailNotConfirmedError";
  }
}

export class SignUpValidationError extends Error {
  readonly fields: { field: string; messages: string[] }[];

  constructor(fields: { field: string; messages: string[] }[]) {
    super("Invalid sign-up input");
    this.name = "SignUpValidationError";
    this.fields = fields;
  }
}
