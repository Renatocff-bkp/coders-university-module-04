import { Inject, Injectable } from "@nestjs/common";

import { isSessionActive, SESSION_TTL_MS } from "../domain/auth-session";
import type { Clock } from "../domain/clock";
import { InvalidTokenError } from "../domain/errors";
import type { AuthSessionRepository } from "../domain/repositories";
import type { TokenGenerator } from "../domain/token-generator";
import {
  AUTH_SESSION_REPOSITORY,
  CLOCK,
  TOKEN_GENERATOR,
} from "../auth.tokens";

export interface CreateSessionInput {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface CreatedSession {
  /** Raw token returned to the client; it is never persisted. */
  token: string;
  sessionId: string;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessions: AuthSessionRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Creates a session and revokes every previous active session for the user,
   * enforcing the "last session wins" rule.
   */
  async create(input: CreateSessionInput): Promise<CreatedSession> {
    const now = this.clock.now();

    await this.sessions.revokeActiveByUserId(input.userId, now);

    const token = this.tokens.generate();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const session = await this.sessions.create({
      userId: input.userId,
      tokenHash: this.tokens.hash(token),
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      expiresAt,
    });

    return { token, sessionId: session.id, expiresAt };
  }

  async validate(rawToken: string): Promise<string | null> {
    if (!rawToken) {
      return null;
    }

    const session = await this.sessions.findByTokenHash(
      this.tokens.hash(rawToken),
    );

    if (!session) {
      return null;
    }

    const now = this.clock.now();

    if (!isSessionActive(session, now)) {
      return null;
    }

    await this.sessions.touchLastUsed(session.id, now);

    return session.userId;
  }

  async revoke(rawToken: string): Promise<void> {
    const session = await this.sessions.findByTokenHash(
      this.tokens.hash(rawToken),
    );

    if (!session) {
      throw new InvalidTokenError();
    }

    await this.sessions.revokeById(session.id, this.clock.now());
  }

  async revokeAll(userId: string): Promise<number> {
    return this.sessions.revokeActiveByUserId(userId, this.clock.now());
  }
}
