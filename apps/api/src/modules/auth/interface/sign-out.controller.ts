import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import type { RequestWithContext } from "../../../shared/http/request-context";
import { SignOutUseCase } from "../application/sign-out.use-case";
import { InvalidTokenError } from "../domain/errors";
import { AuthGuard } from "./auth-guard";

@Controller("auth")
export class SignOutController {
  constructor(private readonly signOut: SignOutUseCase) {}

  @Post("sign-out")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  async execute(@Req() request: RequestWithContext): Promise<void> {
    const userId = request.user?.id;
    const token = request.headers.authorization?.slice("Bearer ".length).trim();

    if (!userId || !token) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Missing bearer token",
      });
    }

    try {
      await this.signOut.execute({
        token,
        userId,
        requestId: request.requestId,
      });
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw new UnauthorizedException({
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
        });
      }

      throw error;
    }
  }
}
