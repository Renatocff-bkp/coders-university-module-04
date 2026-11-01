import { Inject, Injectable, Logger } from "@nestjs/common";

import {
  AUTH_USER_REPOSITORY,
  PASSWORD_HASHER,
  TRANSACTION_MANAGER,
} from "../auth.tokens";
import type { PublicAuthUser } from "../domain/auth-user";
import { toPublicUser } from "../domain/auth-user";
import { normalizeEmail } from "../domain/email";
import {
  EmailNotConfirmedError,
  InvalidCredentialsError,
} from "../domain/errors";
import type { PasswordHasher } from "../domain/password-hasher";
import type { AuthUserRepository } from "../domain/repositories";
import type { TransactionManager } from "../domain/transactions";
import { SessionService } from "./session.service";

export interface SignInRequest {
  email: string;
  password: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  requestId?: string;
}

export interface SignedInAccount {
  /** Session token returned to the SPA; the raw token is never persisted. */
  token: string;
  user: PublicAuthUser;
}

@Injectable()
export class SignInUseCase {
  private readonly logger = new Logger(SignInUseCase.name);

  constructor(
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly sessions: SessionService,
  ) {}

  async execute(input: SignInRequest): Promise<SignedInAccount> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));

    if (
      !user ||
      !(await this.hasher.verify(input.password, user.passwordHash))
    ) {
      this.logger.warn({
        event: "auth.sign_in.failed",
        reason: "invalid_credentials",
        userId: user?.id,
        requestId: input.requestId,
      });

      throw new InvalidCredentialsError();
    }

    if (user.emailConfirmedAt === null) {
      this.logger.warn({
        event: "auth.sign_in.failed",
        reason: "email_not_confirmed",
        userId: user.id,
        requestId: input.requestId,
      });

      throw new EmailNotConfirmedError();
    }

    const session = await this.transactions.run(() =>
      this.sessions.create({
        userId: user.id,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        requestId: input.requestId,
      }),
    );

    this.logger.log({
      event: "auth.sign_in.succeeded",
      userId: user.id,
      requestId: input.requestId,
    });

    return { token: session.token, user: toPublicUser(user) };
  }
}
