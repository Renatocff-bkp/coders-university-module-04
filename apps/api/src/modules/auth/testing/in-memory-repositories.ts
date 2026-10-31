import { randomUUID } from "node:crypto";

import type { AuthSession } from "../domain/auth-session";
import type { AuthToken, AuthTokenType } from "../domain/auth-token";
import type { AuthUser } from "../domain/auth-user";
import type { Clock } from "../domain/clock";
import type {
  AuthSessionRepository,
  AuthTokenRepository,
  AuthUserRepository,
  CreateAuthSessionInput,
  CreateAuthTokenInput,
  CreateAuthUserInput,
} from "../domain/repositories";
import type { TokenGenerator } from "../domain/token-generator";

export class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

export class SequentialTokenGenerator implements TokenGenerator {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `token-${this.counter}`;
  }

  hash(token: string): string {
    return `hashed:${token}`;
  }
}

export class InMemoryAuthUserRepository implements AuthUserRepository {
  readonly users: AuthUser[] = [];

  async findById(id: string): Promise<AuthUser | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(normalizedEmail: string): Promise<AuthUser | null> {
    return this.users.find((user) => user.email === normalizedEmail) ?? null;
  }

  async create(input: CreateAuthUserInput): Promise<AuthUser> {
    const user: AuthUser = {
      id: randomUUID(),
      ...input,
      emailConfirmedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(user);

    return user;
  }
}

export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  readonly sessions: AuthSession[] = [];

  async create(input: CreateAuthSessionInput): Promise<AuthSession> {
    const session: AuthSession = {
      id: randomUUID(),
      ...input,
      revokedAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
    };

    this.sessions.push(session);

    return session;
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    return (
      this.sessions.find((session) => session.tokenHash === tokenHash) ?? null
    );
  }

  async revokeActiveByUserId(userId: string, revokedAt: Date): Promise<number> {
    const active = this.sessions.filter(
      (session) => session.userId === userId && session.revokedAt === null,
    );

    for (const session of active) {
      session.revokedAt = revokedAt;
    }

    return active.length;
  }

  async revokeById(id: string, revokedAt: Date): Promise<void> {
    const session = this.sessions.find((candidate) => candidate.id === id);

    if (session) {
      session.revokedAt = revokedAt;
    }
  }

  async touchLastUsed(id: string, lastUsedAt: Date): Promise<void> {
    const session = this.sessions.find((candidate) => candidate.id === id);

    if (session) {
      session.lastUsedAt = lastUsedAt;
    }
  }
}

export class InMemoryAuthTokenRepository implements AuthTokenRepository {
  readonly tokens: AuthToken[] = [];

  async create(input: CreateAuthTokenInput): Promise<AuthToken> {
    const token: AuthToken = {
      id: randomUUID(),
      ...input,
      type: input.type as AuthTokenType,
      usedAt: null,
      createdAt: new Date(),
    };

    this.tokens.push(token);

    return token;
  }

  async findByTokenHash(tokenHash: string): Promise<AuthToken | null> {
    return this.tokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    const token = this.tokens.find((candidate) => candidate.id === id);

    if (token) {
      token.usedAt = usedAt;
    }
  }

  async invalidateActiveByUserIdAndType(
    userId: string,
    type: AuthTokenType,
    usedAt: Date,
  ): Promise<number> {
    const active = this.tokens.filter(
      (token) =>
        token.userId === userId && token.type === type && token.usedAt === null,
    );

    for (const token of active) {
      token.usedAt = usedAt;
    }

    return active.length;
  }
}
