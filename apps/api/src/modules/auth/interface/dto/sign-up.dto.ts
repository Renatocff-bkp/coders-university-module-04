import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidationOptions,
  type ValidatorConstraintInterface,
} from "class-validator";

import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../../domain/sign-up";

@ValidatorConstraint({ name: "matchesProperty", async: false })
class MatchesPropertyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedProperty] = args.constraints as [string];
    const relatedValue = (args.object as Record<string, unknown>)[
      relatedProperty
    ];

    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedProperty] = args.constraints as [string];

    return `${args.property} must match ${relatedProperty}`;
  }
}

function MatchesProperty(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      constraints: [property],
      validator: MatchesPropertyConstraint,
    });
  };
}

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
