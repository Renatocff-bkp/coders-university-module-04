import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";

import { renderAuthEmail, type OutgoingEmail } from "./auth-email-templates";
import type { AuthEmail, EmailService } from "../domain/email-service";

interface DeliverOptions {
  appUrl: string;
  from: string;
}

@Injectable()
export class ResendEmailService implements EmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly client: Resend;
  private readonly options: DeliverOptions;

  constructor(apiKey: string, options: DeliverOptions) {
    this.client = new Resend(apiKey);
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
    createdAt: Date;
    userAgent: string | null;
  }): Promise<void> {
    await this.deliver({
      to: input.email,
      template: "new_session",
      sessionId: input.sessionId,
      createdAt: input.createdAt,
      userAgent: input.userAgent,
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

    const { error } = await this.client.emails.send({
      from: this.options.from,
      to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(
        { template: email.template, to: email.to },
        "Failed to deliver the auth email",
      );

      throw error;
    }
  }
}
