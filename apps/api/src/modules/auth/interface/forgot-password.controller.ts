import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";

import type { RequestWithContext } from "../../../shared/http/request-context";
import { ForgotPasswordUseCase } from "../application/forgot-password.use-case";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";

export const FORGOT_PASSWORD_ACCEPTED_MESSAGE =
  "If an account exists for that email, we sent a link to reset your password. Check your inbox and spam folder.";

@Controller("auth")
export class ForgotPasswordController {
  constructor(private readonly forgotPassword: ForgotPasswordUseCase) {}

  @Post("forgot-password")
  @HttpCode(HttpStatus.ACCEPTED)
  execute(
    @Body() dto: ForgotPasswordDto,
    @Req() request: RequestWithContext,
  ): { message: string } {
    // Not awaited on purpose: the response must not wait for the lookup or the
    // e-mail, so both outcomes take the same time (see ADR 0011).
    void this.forgotPassword.execute({
      email: dto.email,
      requestId: request.requestId,
    });

    return { message: FORGOT_PASSWORD_ACCEPTED_MESSAGE };
  }
}
