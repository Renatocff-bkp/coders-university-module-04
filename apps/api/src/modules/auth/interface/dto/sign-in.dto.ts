import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, Validate } from "class-validator";

import { IsValidEmailValidator } from "./is-valid-email.validator";

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class SignInDto {
  @Transform(trimString)
  @Validate(IsValidEmailValidator, { message: "Enter a valid email address" })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  password!: string;
}
