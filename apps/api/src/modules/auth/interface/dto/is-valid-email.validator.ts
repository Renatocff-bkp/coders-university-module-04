import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

import { isValidEmail } from "../../domain/email";

@ValidatorConstraint({ name: "isValidEmail", async: false })
export class IsValidEmailValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === "string" && isValidEmail(value);
  }

  defaultMessage(): string {
    return "Enter a valid email address";
  }
}
