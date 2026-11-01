import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@repo/ui";

import { ApiError } from "../../../shared/api-client";
import { clearAuthToken } from "../auth-storage";
import { resetPassword } from "../api/reset-password";
import {
  validateResetPasswordForm,
  type ResetPasswordField,
  type ResetPasswordFieldErrors,
  type ResetPasswordFormValues,
} from "../validation";

const EMPTY_VALUES: ResetPasswordFormValues = {
  password: "",
  passwordConfirmation: "",
};

const GENERIC_ERROR_MESSAGE =
  "We could not reset your password. Please try again.";
const INVALID_LINK_MESSAGE =
  "This reset link is invalid, expired or has already been used.";

const FIELD_LABELS: Record<ResetPasswordField, string> = {
  password: "New password",
  passwordConfirmation: "Confirm new password",
};

const FIELD_ORDER: ResetPasswordField[] = ["password", "passwordConfirmation"];

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get("token")?.trim() ?? "");
  const [values, setValues] = useState<ResetPasswordFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ResetPasswordFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(token === "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmationRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<
    ResetPasswordField,
    RefObject<HTMLInputElement | null>
  > = {
    password: passwordRef,
    passwordConfirmation: passwordConfirmationRef,
  };

  useEffect(() => {
    if (searchParams.has("token")) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const focusFirstInvalid = (fieldErrors: ResetPasswordFieldErrors): void => {
    const first = FIELD_ORDER.find((field) => fieldErrors[field] !== undefined);

    if (first) {
      fieldRefs[first].current?.focus();
    }
  };

  const handleChange =
    (field: ResetPasswordField) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value } = event.target;

      setValues((current) => ({ ...current, [field]: value }));
      setErrors((current) => {
        if (current[field] === undefined) {
          return current;
        }

        const next = { ...current };
        delete next[field];

        return next;
      });
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validateResetPasswordForm(values);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      focusFirstInvalid(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        token,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      });

      clearAuthToken();
      navigate("/auth/sign-in?password=reset", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 410) {
        setInvalidLink(true);
      } else if (error instanceof ApiError && error.fields?.length) {
        const fieldErrors: ResetPasswordFieldErrors = {};

        for (const fieldError of error.fields) {
          const field = fieldError.field as ResetPasswordField;

          if (FIELD_ORDER.includes(field)) {
            fieldErrors[field] =
              fieldError.messages?.[0] ?? GENERIC_ERROR_MESSAGE;
          }
        }

        setErrors(fieldErrors);
        focusFirstInvalid(fieldErrors);
      } else {
        setFormError(GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-linen text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Authentication
          </p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Reset your password
          </h1>
          <p className="text-base text-muted-foreground">
            Choose a new password for your account.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New password</CardTitle>
            <CardDescription>
              Use at least 8 characters. Every active session will be signed
              out.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {invalidLink ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <p>{INVALID_LINK_MESSAGE}</p>
              </div>
            ) : (
              <form
                className="flex flex-col gap-5"
                onSubmit={handleSubmit}
                noValidate
                aria-busy={isSubmitting}
              >
                {formError ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                  >
                    {formError}
                  </div>
                ) : null}

                {FIELD_ORDER.map((field) => (
                  <div key={field} className="flex flex-col gap-2">
                    <Label htmlFor={field}>{FIELD_LABELS[field]}</Label>
                    <Input
                      id={field}
                      name={field}
                      type="password"
                      autoComplete="new-password"
                      value={values[field]}
                      onChange={handleChange(field)}
                      ref={fieldRefs[field]}
                      aria-invalid={errors[field] ? true : undefined}
                      aria-describedby={
                        errors[field] ? `${field}-error` : undefined
                      }
                    />
                    {errors[field] ? (
                      <p
                        id={`${field}-error`}
                        role="alert"
                        className="text-sm text-destructive"
                      >
                        {errors[field]}
                      </p>
                    ) : null}
                  </div>
                ))}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Saving new password…" : "Reset password"}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="justify-center border-t text-sm text-muted-foreground">
            <Link
              to="/auth/forgot-password"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Request a new reset link
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
