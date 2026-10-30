import type { ValidationError } from "class-validator";

export interface FieldError {
  field: string;
  messages: string[];
}

export function flattenValidationErrors(
  errors: ValidationError[],
  parent = "",
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own: FieldError[] = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];

    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}
