import { Inject, Injectable, Logger } from "@nestjs/common";

import { AUTH_USER_REPOSITORY, EMAIL_SERVICE } from "../auth.tokens";
import { PASSWORD_RESET_TTL_MS } from "../domain/auth-token";
import { normalizeEmail } from "../domain/email";
import type { EmailService } from "../domain/email-service";
import type { AuthUserRepository } from "../domain/repositories";
import { OneTimeTokenService } from "./one-time-token.service";

export interface ForgotPasswordRequest {
  email: string;
  requestId?: string;
}

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserRepository,
    private readonly oneTimeTokens: OneTimeTokenService,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
  ) {}

  /**
   * Sends a reset link only to a confirmed account. It never rejects: the
   * caller answers the request before this finishes, so every outcome, including
   * failures, stays invisible in the response.
   */
  async execute(input: ForgotPasswordRequest): Promise<void> {
    try {
      const user = await this.users.findByEmail(normalizeEmail(input.email));

      if (!user || user.emailConfirmedAt === null) {
        return;
      }

      const issued = await this.oneTimeTokens.issue(
        user.id,
        "password_reset",
        PASSWORD_RESET_TTL_MS,
      );

      await this.email.sendPasswordResetEmail({
        userId: user.id,
        email: user.email,
        token: issued.token,
        expiresAt: issued.expiresAt,
      });

      this.logger.log({
        event: "auth.forgot_password.email_sent",
        requestId: input.requestId,
      });
    } catch {
      // Logged without the token, the address or the account id, so the log
      // does not reveal whether the e-mail belongs to an account.
      this.logger.error({
        event: "auth.forgot_password.email_failed",
        requestId: input.requestId,
      });
    }
  }
}
