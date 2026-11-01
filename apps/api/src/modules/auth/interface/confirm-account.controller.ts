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
import { ConfirmAccountUseCase } from "../application/confirm-account.use-case";
import type { PublicAuthUser } from "../domain/auth-user";
import { InvalidTokenError } from "../domain/errors";
import { ConfirmAccountDto } from "./dto/confirm-account.dto";
import { INVALID_TOKEN_MESSAGE } from "./messages";

@Controller("auth")
export class ConfirmAccountController {
  constructor(private readonly confirmAccount: ConfirmAccountUseCase) {}

  @Post("confirm-account")
  @HttpCode(HttpStatus.OK)
  async execute(
    @Body() dto: ConfirmAccountDto,
    @Req() request: RequestWithContext,
  ): Promise<{ token: string; user: PublicAuthUser }> {
    try {
      return await this.confirmAccount.execute({
        token: dto.token,
        userAgent: request.headers["user-agent"] ?? null,
        ipAddress: request.ip ?? null,
        requestId: request.requestId,
      });
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        // Unknown, expired, already used and wrong-type tokens all share the
        // same response so the endpoint cannot be used to probe token state.
        throw new GoneException({
          code: "INVALID_TOKEN",
          message: INVALID_TOKEN_MESSAGE,
        });
      }

      throw error;
    }
  }
}
