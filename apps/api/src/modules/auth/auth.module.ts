import { Module } from "@nestjs/common";
import { createTransport } from "nodemailer";

import { DatabaseModule } from "../../shared/database/database.module";
import { getServerEnv } from "../../shared/config/env";
import { AuthSessionController } from "./interface/auth-session.controller";
import { ConfirmAccountController } from "./interface/confirm-account.controller";
import { SignUpController } from "./interface/sign-up.controller";
import { ConfirmAccountUseCase } from "./application/confirm-account.use-case";
import { OneTimeTokenService } from "./application/one-time-token.service";
import { SessionService } from "./application/session.service";
import { SignUpUseCase } from "./application/sign-up.use-case";
import {
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_REPOSITORY,
  AUTH_USER_REPOSITORY,
  CLOCK,
  EMAIL_SERVICE,
  PASSWORD_HASHER,
  SESSION_TTL_MS,
  TOKEN_GENERATOR,
  TRANSACTION_MANAGER,
} from "./auth.tokens";
import { systemClock } from "./domain/clock";
import type { EmailService } from "./domain/email-service";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher";
import { CryptoTokenGenerator } from "./infrastructure/crypto-token-generator";
import { DrizzleAuthSessionRepository } from "./infrastructure/drizzle-auth-session.repository";
import { DrizzleAuthTokenRepository } from "./infrastructure/drizzle-auth-token.repository";
import { DrizzleAuthUserRepository } from "./infrastructure/drizzle-auth-user.repository";
import { DrizzleTransactionManager } from "./infrastructure/drizzle-transaction-manager";
import { MailtrapEmailService } from "./infrastructure/mailtrap-email.service";
import { ResendEmailService } from "./infrastructure/resend-email.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    AuthSessionController,
    SignUpController,
    ConfirmAccountController,
  ],
  providers: [
    DrizzleTransactionManager,
    DrizzleAuthUserRepository,
    DrizzleAuthSessionRepository,
    DrizzleAuthTokenRepository,
    { provide: TRANSACTION_MANAGER, useExisting: DrizzleTransactionManager },
    { provide: AUTH_USER_REPOSITORY, useExisting: DrizzleAuthUserRepository },
    {
      provide: AUTH_SESSION_REPOSITORY,
      useExisting: DrizzleAuthSessionRepository,
    },
    { provide: AUTH_TOKEN_REPOSITORY, useExisting: DrizzleAuthTokenRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_GENERATOR, useClass: CryptoTokenGenerator },
    { provide: CLOCK, useValue: systemClock },
    {
      provide: SESSION_TTL_MS,
      useFactory: () => getServerEnv().SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    },
    {
      provide: EMAIL_SERVICE,
      useFactory: (): EmailService => {
        const env = getServerEnv();

        if (env.NODE_ENV === "production") {
          return new ResendEmailService(env.RESEND_API_KEY, {
            appUrl: env.APP_URL,
            from: env.EMAIL_FROM,
          });
        }

        const transport = createTransport({
          host: env.MAILTRAP_SMTP_HOST,
          port: env.MAILTRAP_SMTP_PORT,
          auth: {
            user: env.MAILTRAP_SMTP_USER,
            pass: env.MAILTRAP_SMTP_PASS,
          },
          secure: env.MAILTRAP_SMTP_PORT === 465,
        });

        return new MailtrapEmailService(
          async (email) => {
            await transport.sendMail({
              to: email.to,
              subject: email.subject,
              html: email.html,
            });
          },
          { appUrl: env.APP_URL },
        );
      },
    },
    SessionService,
    OneTimeTokenService,
    SignUpUseCase,
    ConfirmAccountUseCase,
  ],
  exports: [
    AUTH_USER_REPOSITORY,
    AUTH_SESSION_REPOSITORY,
    AUTH_TOKEN_REPOSITORY,
    PASSWORD_HASHER,
    TOKEN_GENERATOR,
    SessionService,
    OneTimeTokenService,
    EMAIL_SERVICE,
  ],
})
export class AuthModule {}
