export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  emailConfirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicAuthUser = Omit<AuthUser, "passwordHash">;

export function toPublicUser(user: AuthUser): PublicAuthUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;

  return publicUser;
}
