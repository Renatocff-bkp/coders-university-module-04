export type AuthTokenType = "email_confirmation" | "password_reset";

export interface AuthToken {
  id: string;
  userId: string;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export const EMAIL_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function isTokenUsable(token: AuthToken, now: Date): boolean {
  return token.usedAt === null && token.expiresAt.getTime() > now.getTime();
}
