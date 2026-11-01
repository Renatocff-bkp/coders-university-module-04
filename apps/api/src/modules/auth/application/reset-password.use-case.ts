import { Inject, Injectable, Logger } from "@nestjs/common";

import {
  AUTH_USER_REPOSITORY,
  CLOCK,
  EMAIL_SERVICE,
  PASSWORD_HASHER,
  TRANSACTION_MANAGER,
} from "../auth.tokens";
import type { Clock } from "../domain/clock";
import type { EmailService } from "../domain/email-service";
import { InvalidTokenError } from "../domain/errors";
import type { PasswordHasher } from "../domain/password-hasher";
import type { AuthUserRepository } from "../domain/repositories";
import type { TransactionManager } from "../domain/transactions";
import { OneTimeTokenService } from "./one-time-token.service";
import { SessionService } from "./session.service";

export interface ResetPasswordRequest {
  token?: string;
  password: string;
  requestId?: string;
}

interface PasswordResetResult {
  userId: string;
  email: string;
  revokedSessions: number;
}

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    private readonly oneTimeTokens: OneTimeTokenService,
    @Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserRepository,
    private readonly sessions: SessionService,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Consumes the reset token, replaces the password and revokes every active
   * session in one transaction. The hash is computed before the transaction so
   * bcrypt does not hold a database connection open.
   */
  async execute(input: ResetPasswordRequest): Promise<void> {
    const rawToken = input.token?.trim() ?? "";

    if (!rawToken) {
      this.logger.warn({
        event: "auth.reset_password.failed",
        reason: "missing_token",
        requestId: input.requestId,
      });

      throw new InvalidTokenError();
    }

    const passwordHash = await this.hasher.hash(input.password);

    let result: PasswordResetResult;

    try {
      result = await this.transactions.run(async () => {
        const consumed = await this.oneTimeTokens.consume(
          rawToken,
          "password_reset",
        );
        const user = await this.users.updatePasswordHash(
          consumed.userId,
          passwordHash,
          this.clock.now(),
        );
        const revokedSessions = await this.sessions.revokeAll(user.id);

        return { userId: user.id, email: user.email, revokedSessions };
      });
    } catch (error) {
      this.logger.warn({
        event: "auth.reset_password.failed",
        reason:
          error instanceof InvalidTokenError
            ? "invalid_token"
            : "unexpected_error",
        requestId: input.requestId,
      });

      throw error;
    }

    this.logger.log({
      event: "auth.reset_password.succeeded",
      userId: result.userId,
      revokedSessions: result.revokedSessions,
      requestId: input.requestId,
    });

    await this.notifyPasswordChanged(result, input.requestId);
  }

  /**
   * Runs after the commit, so the notice never claims a change that was rolled
   * back. A delivery failure is logged and does not undo the reset.
   */
  private async notifyPasswordChanged(
    result: PasswordResetResult,
    requestId?: string,
  ): Promise<void> {
    try {
      await this.email.sendPasswordChangedEmail({
        userId: result.userId,
        email: result.email,
      });
    } catch {
      this.logger.error({
        event: "auth.reset_password.email_failed",
        userId: result.userId,
        requestId,
      });
    }
  }
}
