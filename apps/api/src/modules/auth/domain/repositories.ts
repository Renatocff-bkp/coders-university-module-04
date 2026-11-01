import type { AuthSession } from "./auth-session";
import type { AuthToken, AuthTokenType } from "./auth-token";
import type { AuthUser } from "./auth-user";

export interface CreateAuthUserInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
}

export interface AuthUserRepository {
  findById(id: string): Promise<AuthUser | null>;
  findByEmail(normalizedEmail: string): Promise<AuthUser | null>;
  create(input: CreateAuthUserInput): Promise<AuthUser>;
  markEmailConfirmed(id: string, confirmedAt: Date): Promise<AuthUser>;
}

export interface CreateAuthSessionInput {
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
}

export interface AuthSessionRepository {
  create(input: CreateAuthSessionInput): Promise<AuthSession>;
  findByTokenHash(tokenHash: string): Promise<AuthSession | null>;
  revokeActiveByUserId(userId: string, revokedAt: Date): Promise<number>;
  revokeById(id: string, revokedAt: Date): Promise<void>;
  touchLastUsed(id: string, lastUsedAt: Date): Promise<void>;
}

export interface CreateAuthTokenInput {
  userId: string;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
}

export interface AuthTokenRepository {
  create(input: CreateAuthTokenInput): Promise<AuthToken>;
  findByTokenHash(tokenHash: string): Promise<AuthToken | null>;
  /**
   * Marks the token as used only when it is still unused. Returns whether the
   * row was updated, which makes the consumption safe under concurrency.
   */
  markUsedIfUnused(id: string, usedAt: Date): Promise<boolean>;
  invalidateActiveByUserIdAndType(
    userId: string,
    type: AuthTokenType,
    usedAt: Date,
  ): Promise<number>;
}
