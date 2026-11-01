import { Inject, Injectable, Logger } from "@nestjs/common";

import {
  AUTH_USER_REPOSITORY,
  CLOCK,
  TRANSACTION_MANAGER,
} from "../auth.tokens";
import type { PublicAuthUser } from "../domain/auth-user";
import { toPublicUser } from "../domain/auth-user";
import type { Clock } from "../domain/clock";
import { InvalidTokenError } from "../domain/errors";
import type { AuthUserRepository } from "../domain/repositories";
import type { TransactionManager } from "../domain/transactions";
import { OneTimeTokenService } from "./one-time-token.service";
import { SessionService } from "./session.service";

export interface ConfirmAccountRequest {
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  requestId?: string;
}

export interface ConfirmedAccount {
  /** Session token returned to the SPA; the raw token is never persisted. */
  token: string;
  user: PublicAuthUser;
}

@Injectable()
export class ConfirmAccountUseCase {
  private readonly logger = new Logger(ConfirmAccountUseCase.name);

  constructor(
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    private readonly oneTimeTokens: OneTimeTokenService,
    @Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserRepository,
    private readonly sessions: SessionService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: ConfirmAccountRequest): Promise<ConfirmedAccount> {
    const rawToken = input.token?.trim() ?? "";

    if (!rawToken) {
      this.logger.warn({
        event: "auth.confirm_account.failed",
        reason: "missing_token",
        requestId: input.requestId,
      });

      throw new InvalidTokenError();
    }

    try {
      const result = await this.transactions.run(async () => {
        const consumed = await this.oneTimeTokens.consume(
          rawToken,
          "email_confirmation",
        );
        const confirmedAt = this.clock.now();
        const user = await this.users.markEmailConfirmed(
          consumed.userId,
          confirmedAt,
        );
        const session = await this.sessions.create({
          userId: user.id,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
          requestId: input.requestId,
        });

        return { token: session.token, user: toPublicUser(user) };
      });

      this.logger.log({
        event: "auth.confirm_account.succeeded",
        userId: result.user.id,
        requestId: input.requestId,
      });

      return result;
    } catch (error) {
      this.logger.warn({
        event: "auth.confirm_account.failed",
        reason:
          error instanceof InvalidTokenError
            ? "invalid_token"
            : "unexpected_error",
        requestId: input.requestId,
      });

      throw error;
    }
  }
}
