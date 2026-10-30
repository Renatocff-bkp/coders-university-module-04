export interface AuthSession {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isSessionActive(session: AuthSession, now: Date): boolean {
  return (
    session.revokedAt === null && session.expiresAt.getTime() > now.getTime()
  );
}
