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
    const token = this.generator.generate();
    const expiresAt = new Date(this.clock.now().getTime() + ttlMs);
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

    await this.tokens.markUsed(record.id, now);

    return { ...record, usedAt: now };
  }
}
