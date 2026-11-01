import { Inject, Injectable } from "@nestjs/common";

import { AUTH_USER_REPOSITORY } from "../auth.tokens";
import type { PublicAuthUser } from "../domain/auth-user";
import { toPublicUser } from "../domain/auth-user";
import { SessionUserNotFoundError } from "../domain/errors";
import type { AuthUserRepository } from "../domain/repositories";

export interface GetSessionRequest {
  userId: string;
}

export interface GetSessionResult {
  user: PublicAuthUser;
}

@Injectable()
export class GetSessionUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserRepository,
  ) {}

  async execute(input: GetSessionRequest): Promise<GetSessionResult> {
    const user = await this.users.findById(input.userId);

    if (!user) {
      throw new SessionUserNotFoundError();
    }

    return { user: toPublicUser(user) };
  }
}