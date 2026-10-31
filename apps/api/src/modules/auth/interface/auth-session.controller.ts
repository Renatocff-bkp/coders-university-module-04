import {
  Controller,
  Get,
  Inject,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import type { PublicAuthUser } from "../domain/auth-user";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { AUTH_USER_REPOSITORY } from "../auth.tokens";
import type { AuthUserRepository } from "../domain/repositories";
import { toPublicUser } from "../domain/auth-user";
import { AuthGuard } from "./auth-guard";

@Controller("auth")
export class AuthSessionController {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUsers: AuthUserRepository,
  ) {}

  @Get("session")
  @UseGuards(AuthGuard)
  async getSession(@Req() request: RequestWithContext): Promise<{
    user: PublicAuthUser;
  }> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Missing bearer token",
      });
    }

    const user = await this.authUsers.findById(userId);

    if (!user) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Session user not found",
      });
    }

    return { user: toPublicUser(user) };
  }
}
