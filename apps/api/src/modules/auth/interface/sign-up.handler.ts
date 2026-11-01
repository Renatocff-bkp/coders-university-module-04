import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";

import type { RequestWithContext } from "../../../shared/http/request-context";
import { SignUpUseCase } from "../application/sign-up.use-case";
import { SignUpValidationError } from "../domain/errors";
import { SignUpDto } from "./dto/sign-up.dto";

export const SIGN_UP_ACCEPTED_MESSAGE =
  "Check your email to confirm your account";

@Controller("auth")
export class SignUpHandler {
  constructor(private readonly signUp: SignUpUseCase) {}

  @Post("sign-up")
  @HttpCode(HttpStatus.ACCEPTED)
  async execute(
    @Body() dto: SignUpDto,
    @Req() request: RequestWithContext,
  ): Promise<{ message: string }> {
    try {
      await this.signUp.execute({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: dto.password,
        passwordConfirmation: dto.passwordConfirmation,
        requestId: request.requestId,
      });
    } catch (error) {
      if (error instanceof SignUpValidationError) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          fields: error.fields,
        });
      }

      throw error;
    }

    return { message: SIGN_UP_ACCEPTED_MESSAGE };
  }
}
