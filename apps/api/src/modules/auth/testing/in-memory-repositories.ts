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
import type { TransactionManager } from "../domain/transactions";

export interface SnapshotParticipant {
  snapshot(): unknown;
  restore(snapshot: unknown): void;
}

/**
 * Test double for the real transaction boundary. It cannot roll back SQL, so
 * it snapshots the in-memory repositories and restores them when the work
 * throws, which is enough to assert atomicity in unit tests.
 */
export class InMemoryTransactionManager implements TransactionManager {
  constructor(private readonly participants: SnapshotParticipant[] = []) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    const snapshots = this.participants.map((participant) =>
      participant.snapshot(),
    );

    try {
      return await work();
    } catch (error) {
      this.participants.forEach((participant, index) => {
        participant.restore(snapshots[index]);
      });

      throw error;
    }
  }
}

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

  snapshot(): AuthUser[] {
    return structuredClone(this.users);
  }

  restore(snapshot: unknown): void {
    this.users.splice(0, this.users.length, ...(snapshot as AuthUser[]));
  }

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

  async markEmailConfirmed(id: string, confirmedAt: Date): Promise<AuthUser> {
    const user = this.users.find((candidate) => candidate.id === id);

    if (!user) {
      throw new Error("Auth user not found");
    }

    user.emailConfirmedAt = confirmedAt;
    user.updatedAt = confirmedAt;

    return user;
  }
}

export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  readonly sessions: AuthSession[] = [];

  snapshot(): AuthSession[] {
    return structuredClone(this.sessions);
  }

  restore(snapshot: unknown): void {
    this.sessions.splice(0, this.sessions.length, ...(snapshot as AuthSession[]));
  }

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

  snapshot(): AuthToken[] {
    return structuredClone(this.tokens);
  }

  restore(snapshot: unknown): void {
    this.tokens.splice(0, this.tokens.length, ...(snapshot as AuthToken[]));
  }

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

  async markUsedIfUnused(id: string, usedAt: Date): Promise<boolean> {
    const token = this.tokens.find(
      (candidate) => candidate.id === id && candidate.usedAt === null,
    );

    if (!token) {
      return false;
    }

    token.usedAt = usedAt;

    return true;
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
