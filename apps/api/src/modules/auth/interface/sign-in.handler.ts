import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import type { RequestWithContext } from "../../../shared/http/request-context";
import type { PublicAuthUser } from "../domain/auth-user";
import {
  EmailNotConfirmedError,
  InvalidCredentialsError,
} from "../domain/errors";
import { SignInUseCase } from "../application/sign-in.use-case";
import { SignInDto } from "./dto/sign-in.dto";

export const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";
export const EMAIL_NOT_CONFIRMED_MESSAGE =
  "Confirm your email address before signing in. Open the confirmation link we sent you.";

@Controller("auth")
export class SignInHandler {
  constructor(private readonly signIn: SignInUseCase) {}

  @Post("sign-in")
  @HttpCode(HttpStatus.OK)
  async execute(
    @Body() dto: SignInDto,
    @Req() request: RequestWithContext,
  ): Promise<{ token: string; user: PublicAuthUser }> {
    try {
      return await this.signIn.execute({
        email: dto.email,
        password: dto.password,
        userAgent: request.headers["user-agent"] ?? null,
        ipAddress: request.ip ?? null,
        requestId: request.requestId,
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException({
          code: "INVALID_CREDENTIALS",
          message: INVALID_CREDENTIALS_MESSAGE,
        });
      }

      if (error instanceof EmailNotConfirmedError) {
        throw new ForbiddenException({
          code: "EMAIL_NOT_CONFIRMED",
          message: EMAIL_NOT_CONFIRMED_MESSAGE,
        });
      }

      throw error;
    }
  }
}
