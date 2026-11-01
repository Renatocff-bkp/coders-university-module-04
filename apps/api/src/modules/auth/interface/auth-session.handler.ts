import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import type { PublicAuthUser } from "../domain/auth-user";
import type { RequestWithContext } from "../../../shared/http/request-context";
import { SessionUserNotFoundError } from "../domain/errors";
import { GetSessionUseCase } from "../application/get-session.use-case";
import { AuthGuard } from "./auth-guard";

@Controller("auth")
export class AuthSessionHandler {
  constructor(private readonly getSessionUseCase: GetSessionUseCase) {}

  @Get("session")
  @UseGuards(AuthGuard)
  async getSession(@Req() request: RequestWithContext): Promise<{
    user: PublicAuthUser;
  }> {
    try {
      return await this.getSessionUseCase.execute({
        userId: request.user?.id ?? "",
      });
    } catch (error) {
      if (error instanceof SessionUserNotFoundError) {
        throw new UnauthorizedException({
          code: "UNAUTHORIZED",
          message: "Session user not found",
        });
      }

      throw error;
    }
  }
}
