export const AUTH_EMAIL_TEMPLATES = [
  "email_confirmation",
  "new_session",
  "password_reset",
  "password_changed",
] as const;

export type AuthEmailTemplate = (typeof AUTH_EMAIL_TEMPLATES)[number];

export interface AuthEmail {
  to: string;
  template: AuthEmailTemplate;
  token?: string | null;
  expiresAt?: Date | null;
  sessionId?: string | null;
}

export interface EmailService {
  sendEmailConfirmation(input: {
    userId: string;
    email: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;

  sendNewSessionEmail(input: {
    userId: string;
    email: string;
    sessionId: string;
  }): Promise<void>;

  sendPasswordResetEmail(input: {
    userId: string;
    email: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;

  sendPasswordChangedEmail(input: {
    userId: string;
    email: string;
  }): Promise<void>;
}
