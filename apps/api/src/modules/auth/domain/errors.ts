export class InvalidTokenError extends Error {
  constructor() {
    super("Invalid or expired token");
    this.name = "InvalidTokenError";
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
