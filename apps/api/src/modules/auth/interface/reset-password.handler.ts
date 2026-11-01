import {
  Body,
  Controller,
  GoneException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";

import type { RequestWithContext } from "../../../shared/http/request-context";
import { ResetPasswordUseCase } from "../application/reset-password.use-case";
import { InvalidTokenError } from "../domain/errors";
import { INVALID_TOKEN_MESSAGE } from "./messages";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Controller("auth")
export class ResetPasswordHandler {
  constructor(private readonly resetPassword: ResetPasswordUseCase) {}

  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async execute(
    @Body() dto: ResetPasswordDto,
    @Req() request: RequestWithContext,
  ): Promise<void> {
    try {
      await this.resetPassword.execute({
        token: dto.token,
        password: dto.password,
        requestId: request.requestId,
      });
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        // Missing, unknown, expired, used and wrong-type tokens share one
        // response so the endpoint cannot be used to probe token state.
        throw new GoneException({
          code: "INVALID_TOKEN",
          message: INVALID_TOKEN_MESSAGE,
        });
      }

      throw error;
    }
  }
}
