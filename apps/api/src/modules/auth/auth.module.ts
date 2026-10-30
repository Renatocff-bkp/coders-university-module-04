import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../shared/database/database.module";
import { OneTimeTokenService } from "./application/one-time-token.service";
import { SessionService } from "./application/session.service";
import {
  AUTH_SESSION_REPOSITORY,
  AUTH_TOKEN_REPOSITORY,
  AUTH_USER_REPOSITORY,
  CLOCK,
  PASSWORD_HASHER,
  TOKEN_GENERATOR,
} from "./auth.tokens";
import { systemClock } from "./domain/clock";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher";
import { CryptoTokenGenerator } from "./infrastructure/crypto-token-generator";
import { DrizzleAuthSessionRepository } from "./infrastructure/drizzle-auth-session.repository";
import { DrizzleAuthTokenRepository } from "./infrastructure/drizzle-auth-token.repository";
import { DrizzleAuthUserRepository } from "./infrastructure/drizzle-auth-user.repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    DrizzleAuthUserRepository,
    DrizzleAuthSessionRepository,
    DrizzleAuthTokenRepository,
    { provide: AUTH_USER_REPOSITORY, useExisting: DrizzleAuthUserRepository },
    {
      provide: AUTH_SESSION_REPOSITORY,
      useExisting: DrizzleAuthSessionRepository,
    },
    { provide: AUTH_TOKEN_REPOSITORY, useExisting: DrizzleAuthTokenRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_GENERATOR, useClass: CryptoTokenGenerator },
    { provide: CLOCK, useValue: systemClock },
    SessionService,
    OneTimeTokenService,
  ],
  exports: [
    AUTH_USER_REPOSITORY,
    AUTH_SESSION_REPOSITORY,
    AUTH_TOKEN_REPOSITORY,
    PASSWORD_HASHER,
    TOKEN_GENERATOR,
    SessionService,
    OneTimeTokenService,
  ],
})
export class AuthModule {}
