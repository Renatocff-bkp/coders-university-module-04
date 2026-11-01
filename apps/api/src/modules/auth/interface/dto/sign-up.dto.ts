import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../../domain/sign-up";
import { MatchesProperty } from "./matches-property";

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class SignUpDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  @MaxLength(NAME_MAX_LENGTH, {
    message: `First name must be at most ${NAME_MAX_LENGTH} characters`,
  })
  firstName!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: "Last name is required" })
  @MaxLength(NAME_MAX_LENGTH, {
    message: `Last name must be at most ${NAME_MAX_LENGTH} characters`,
  })
  lastName!: string;

  @Transform(trimString)
  @IsEmail({}, { message: "Enter a valid email address" })
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  password!: string;

  @IsString()
  @MatchesProperty("password", { message: "Passwords do not match" })
  passwordConfirmation!: string;
}
