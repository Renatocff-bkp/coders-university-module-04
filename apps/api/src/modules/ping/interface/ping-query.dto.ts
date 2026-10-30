import { IsOptional, IsString, MaxLength } from "class-validator";

export class PingQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;
}
