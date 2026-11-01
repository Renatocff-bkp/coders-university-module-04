import { Inject, Injectable, Logger, Optional } from "@nestjs/common";

import {
  isSessionActive,
  SESSION_TTL_MS as DEFAULT_SESSION_TTL_MS,
} from "../domain/auth-session";
import type { Clock } from "../domain/clock";
import { InvalidTokenError } from "../domain/errors";
import type {
  AuthSessionRepository,
  AuthUserRepository,
} from "../domain/repositories";
import type { EmailService } from "../domain/email-service";
import type { TokenGenerator } from "../domain/token-generator";
import {
  AUTH_SESSION_REPOSITORY,
  AUTH_USER_REPOSITORY,
  CLOCK,
  EMAIL_SERVICE,
  SESSION_TTL_MS,
  TOKEN_GENERATOR,
} from "../auth.tokens";

export interface CreateSessionInput {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  requestId?: string;
}

export interface CreatedSession {
  /** Raw token returned to the client; it is never persisted. */
  token: string;
  sessionId: string;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessions: AuthSessionRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserRepository,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
    @Optional()
    @Inject(SESSION_TTL_MS)
    private readonly sessionTtlMs: number = DEFAULT_SESSION_TTL_MS,
  ) {}

  /**
   * Creates a session and revokes every previous active session for the user,
   * enforcing the "last session wins" rule.
   */
  async create(input: CreateSessionInput): Promise<CreatedSession> {
    const now = this.clock.now();

    await this.sessions.revokeActiveByUserId(input.userId, now);

    const token = this.tokens.generate();
    const expiresAt = new Date(now.getTime() + this.sessionTtlMs);
    const session = await this.sessions.create({
      userId: input.userId,
      tokenHash: this.tokens.hash(token),
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      expiresAt,
    });

    this.logger.log({
      event: "auth.session.created",
      userId: input.userId,
      sessionId: session.id,
      requestId: input.requestId,
    });

    await this.sendNewSessionEmail(session.id, now, input);

    return { token, sessionId: session.id, expiresAt };
  }

  private async sendNewSessionEmail(
    sessionId: string,
    createdAt: Date,
    input: CreateSessionInput,
  ): Promise<void> {
    const user = await this.users.findById(input.userId);

    if (!user) {
      return;
    }

    try {
      await this.email.sendNewSessionEmail({
        userId: user.id,
        email: user.email,
        sessionId,
        createdAt,
        userAgent: input.userAgent ?? null,
      });
    } catch {
      // The session is already valid; a mailer outage must not fail the login
      // or the account confirmation. The token never reaches the logs.
      this.logger.error({
        event: "auth.session.new_session_email_failed",
        userId: user.id,
        sessionId,
        requestId: input.requestId,
      });
    }
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

    // Throttle last-used writes to reduce write amplification under load:
    // only persist when the previous value is older than the threshold.
    const lastUsedThresholdMs = 60_000;
    const previousLastUsed = session.lastUsedAt
      ? session.lastUsedAt.getTime()
      : 0;
    if (now.getTime() - previousLastUsed >= lastUsedThresholdMs) {
      await this.sessions.touchLastUsed(session.id, now);
    }

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

    this.logger.log({
      event: "auth.session.revoked",
      userId: session.userId,
      sessionId: session.id,
    });
  }

  async revokeAll(userId: string): Promise<number> {
    return this.sessions.revokeActiveByUserId(userId, this.clock.now());
  }
}
