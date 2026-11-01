import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

const TOKEN_MAX_LENGTH = 512;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class ConfirmAccountDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: "Token is required" })
  @MaxLength(TOKEN_MAX_LENGTH, {
    message: `Token must be at most ${TOKEN_MAX_LENGTH} characters`,
  })
  token!: string;
}
