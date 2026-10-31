import type { AuthEmail, EmailService } from "../domain/email-service";

interface ConfirmationInput {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

interface NewSessionInput {
  userId: string;
  email: string;
  sessionId: string;
}

interface PasswordResetInput {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

interface PasswordChangedInput {
  userId: string;
  email: string;
}

export class FakeEmailService implements EmailService {
  readonly sent: AuthEmail[] = [];

  async sendEmailConfirmation(input: ConfirmationInput): Promise<void> {
    this.sent.push({
      to: input.email,
      template: "email_confirmation",
      token: input.token,
      expiresAt: input.expiresAt,
    });
  }

  async sendNewSessionEmail(input: NewSessionInput): Promise<void> {
    this.sent.push({
      to: input.email,
      template: "new_session",
      sessionId: input.sessionId,
    });
  }

  async sendPasswordResetEmail(input: PasswordResetInput): Promise<void> {
    this.sent.push({
      to: input.email,
      template: "password_reset",
      token: input.token,
      expiresAt: input.expiresAt,
    });
  }

  async sendPasswordChangedEmail(input: PasswordChangedInput): Promise<void> {
    this.sent.push({
      to: input.email,
      template: "password_changed",
    });
  }
}
