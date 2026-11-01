import { Inject, Injectable } from "@nestjs/common";

import type { AuthToken, AuthTokenType } from "../domain/auth-token";
import { isTokenUsable } from "../domain/auth-token";
import type { Clock } from "../domain/clock";
import { InvalidTokenError } from "../domain/errors";
import type { AuthTokenRepository } from "../domain/repositories";
import type { TokenGenerator } from "../domain/token-generator";
import { AUTH_TOKEN_REPOSITORY, CLOCK, TOKEN_GENERATOR } from "../auth.tokens";

export interface IssuedToken {
  /** Raw token sent by e-mail; it is never persisted. */
  token: string;
  tokenId: string;
  expiresAt: Date;
}

@Injectable()
export class OneTimeTokenService {
  constructor(
    @Inject(AUTH_TOKEN_REPOSITORY)
    private readonly tokens: AuthTokenRepository,
    @Inject(TOKEN_GENERATOR) private readonly generator: TokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async issue(
    userId: string,
    type: AuthTokenType,
    ttlMs: number,
  ): Promise<IssuedToken> {
    const now = this.clock.now();
    const token = this.generator.generate();
    const expiresAt = new Date(now.getTime() + ttlMs);

    // A new token supersedes every unused token of the same type, so an old
    // e-mail link cannot be replayed after a resend.
    await this.tokens.invalidateActiveByUserIdAndType(userId, type, now);

    const record = await this.tokens.create({
      userId,
      type,
      tokenHash: this.generator.hash(token),
      expiresAt,
    });

    return { token, tokenId: record.id, expiresAt };
  }

  async consume(rawToken: string, type: AuthTokenType): Promise<AuthToken> {
    if (!rawToken) {
      throw new InvalidTokenError();
    }

    const record = await this.tokens.findByTokenHash(
      this.generator.hash(rawToken),
    );
    const now = this.clock.now();

    if (!record || record.type !== type || !isTokenUsable(record, now)) {
      throw new InvalidTokenError();
    }

    // Conditional update: two concurrent requests may both read the same row,
    // but only one can flip used_at from NULL.
    const consumed = await this.tokens.markUsedIfUnused(record.id, now);

    if (!consumed) {
      throw new InvalidTokenError();
    }

    return { ...record, usedAt: now };
  }
}
