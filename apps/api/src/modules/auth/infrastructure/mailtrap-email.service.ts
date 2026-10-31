import { Injectable, Logger } from "@nestjs/common";

import { renderAuthEmail, type OutgoingEmail } from "./auth-email-templates";
import type { AuthEmail, EmailService } from "../domain/email-service";

@Injectable()
export class MailtrapEmailService implements EmailService {
  private readonly logger = new Logger(MailtrapEmailService.name);
  private readonly send: (email: OutgoingEmail) => Promise<void>;
  private readonly options: { appUrl: string };

  constructor(
    send: (email: OutgoingEmail) => Promise<void>,
    options: { appUrl: string },
  ) {
    this.send = send;
    this.options = options;
  }

  async sendEmailConfirmation(input: {
    userId: string;
    email: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.deliver({
      to: input.email,
      template: "email_confirmation",
      token: input.token,
      expiresAt: input.expiresAt,
    });
  }

  async sendNewSessionEmail(input: {
    userId: string;
    email: string;
    sessionId: string;
  }): Promise<void> {
    await this.deliver({
      to: input.email,
      template: "new_session",
      sessionId: input.sessionId,
    });
  }

  async sendPasswordResetEmail(input: {
    userId: string;
    email: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.deliver({
      to: input.email,
      template: "password_reset",
      token: input.token,
      expiresAt: input.expiresAt,
    });
  }

  async sendPasswordChangedEmail(input: {
    userId: string;
    email: string;
  }): Promise<void> {
    await this.deliver({
      to: input.email,
      template: "password_changed",
    });
  }

  private async deliver(email: AuthEmail): Promise<void> {
    const { to, subject, html } = renderAuthEmail(email, this.options);

    try {
      await this.send({ to, subject, html });
    } catch (error) {
      // Auth emails must never leak the token or the password in logs.
      this.logger.error(
        { template: email.template, to: email.to },
        "Failed to deliver the auth email",
      );

      throw error;
    }
  }
}
