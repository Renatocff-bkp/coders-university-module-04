import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

import { PASSWORD_MIN_LENGTH } from "../../domain/sign-up";
import { MatchesProperty } from "./matches-property";

const TOKEN_MAX_LENGTH = 512;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class ResetPasswordDto {
  /**
   * Optional on purpose: a missing token is answered as an invalid token (410),
   * the same as an unknown one, not as a validation error.
   */
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(TOKEN_MAX_LENGTH, {
    message: `Token must be at most ${TOKEN_MAX_LENGTH} characters`,
  })
  token?: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  password!: string;

  @IsString()
  @MatchesProperty("password", { message: "Passwords do not match" })
  passwordConfirmation!: string;
}
