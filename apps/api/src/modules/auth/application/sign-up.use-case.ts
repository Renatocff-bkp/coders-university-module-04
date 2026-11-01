import { Inject, Injectable, Logger } from "@nestjs/common";

import {
  AUTH_USER_REPOSITORY,
  EMAIL_SERVICE,
  PASSWORD_HASHER,
} from "../auth.tokens";
import { EMAIL_CONFIRMATION_TTL_MS } from "../domain/auth-token";
import type { AuthUser } from "../domain/auth-user";
import { normalizeEmail } from "../domain/email";
import type { EmailService } from "../domain/email-service";
import { SignUpValidationError } from "../domain/errors";
import type { PasswordHasher } from "../domain/password-hasher";
import type { AuthUserRepository } from "../domain/repositories";
import { validateSignUpInput } from "../domain/sign-up";
import { OneTimeTokenService } from "./one-time-token.service";

export interface SignUpRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  requestId?: string;
}

export type SignUpOutcome =
  "created" | "confirmation_resent" | "confirmation_skipped";

@Injectable()
export class SignUpUseCase {
  private readonly logger = new Logger(SignUpUseCase.name);

  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly users: AuthUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly oneTimeTokens: OneTimeTokenService,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
  ) {}

  /**
   * Creates an unconfirmed account and sends the confirmation link. The
   * outcome is intentionally internal: the HTTP response stays generic so the
   * endpoint cannot be used to enumerate registered e-mails.
   */
  async execute(input: SignUpRequest): Promise<SignUpOutcome> {
    const errors = validateSignUpInput(input);

    if (errors.length > 0) {
      throw new SignUpValidationError(errors);
    }

    const normalizedEmail = normalizeEmail(input.email);
    const existing = await this.users.findByEmail(normalizedEmail);

    if (existing) {
      if (existing.emailConfirmedAt !== null) {
        this.logger.log({
          event: "auth.sign_up.confirmation_skipped",
          userId: existing.id,
          requestId: input.requestId,
        });

        return "confirmation_skipped";
      }

      await this.sendConfirmation(existing, input.requestId);
      this.logger.log({
        event: "auth.sign_up.confirmation_resent",
        userId: existing.id,
        requestId: input.requestId,
      });

      return "confirmation_resent";
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    await this.sendConfirmation(user, input.requestId);
    this.logger.log({
      event: "auth.sign_up.created",
      userId: user.id,
      requestId: input.requestId,
    });

    return "created";
  }

  private async sendConfirmation(
    user: AuthUser,
    requestId?: string,
  ): Promise<void> {
    const issued = await this.oneTimeTokens.issue(
      user.id,
      "email_confirmation",
      EMAIL_CONFIRMATION_TTL_MS,
    );

    try {
      await this.email.sendEmailConfirmation({
        userId: user.id,
        email: user.email,
        token: issued.token,
        expiresAt: issued.expiresAt,
      });
    } catch {
      // A delivery failure must not change the response: it would reveal
      // whether an account was just created. Neither the token nor the
      // password may reach the logs.
      this.logger.error({
        event: "auth.sign_up.confirmation_email_failed",
        userId: user.id,
        requestId,
      });
    }
  }
}
