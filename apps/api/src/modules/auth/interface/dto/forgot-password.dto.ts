import { Transform } from "class-transformer";
import { IsEmail } from "class-validator";

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class ForgotPasswordDto {
  @Transform(trimString)
  @IsEmail({}, { message: "Enter a valid email address" })
  email!: string;
}
