import {
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
import { signIn } from "../api/sign-in";
import { useAuth } from "../AuthProvider";
import {
  validateSignInForm,
  type SignInField,
  type SignInFieldErrors,
  type SignInFormValues,
} from "../validation";

const EMPTY_VALUES: SignInFormValues = {
  email: "",
  password: "",
};

const GENERIC_ERROR_MESSAGE = "We could not sign you in. Please try again.";
const SESSION_ENDED_MESSAGE =
  "Your session has ended because you signed in somewhere else or it expired. Sign in again to continue.";

const FIELD_LABELS: Record<SignInField, string> = {
  email: "Email",
  password: "Password",
};

interface FormFieldProps {
  field: SignInField;
  type: "email" | "password";
  autoComplete: string;
  value: string;
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function FormField({
  field,
  type,
  autoComplete,
  value,
  error,
  inputRef,
  onChange,
}: FormFieldProps) {
  const errorId = `${field}-error`;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={field}>{FIELD_LABELS[field]}</Label>
      <Input
        id={field}
        name={field}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        ref={inputRef}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function toFormMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403)
  ) {
    return error.message;
  }

  return GENERIC_ERROR_MESSAGE;
}

export default function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { saveToken } = useAuth();
  const [values, setValues] = useState<SignInFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<SignInFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const sessionEnded = searchParams.get("session") === "ended";

  const handleChange =
    (field: SignInField) =>
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

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validateSignInForm(values);
    setErrors(validationErrors);

    if (validationErrors.email !== undefined) {
      emailRef.current?.focus();
      return;
    }

    if (validationErrors.password !== undefined) {
      passwordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const { token } = await signIn({
        email: values.email.trim(),
        password: values.password,
      });

      saveToken(token);
      navigate("/app", { replace: true });
    } catch (error) {
      setFormError(toFormMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSessionEnded = sessionEnded && formError === null;

  return (
    <main className="min-h-dvh bg-linen text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Authentication
          </p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Sign in
          </h1>
          <p className="text-base text-muted-foreground">
            Use the email and password of your account.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>
              Signing in here ends any session you have open on another device.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              className="flex flex-col gap-5"
              onSubmit={handleSubmit}
              noValidate
              aria-busy={isSubmitting}
            >
              {showSessionEnded ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground"
                >
                  <p>{SESSION_ENDED_MESSAGE}</p>
                </div>
              ) : null}

              {formError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  <p>{formError}</p>
                </div>
              ) : null}

              <FormField
                field="email"
                type="email"
                autoComplete="email"
                value={values.email}
                error={errors.email}
                inputRef={emailRef}
                onChange={handleChange("email")}
              />

              <div className="flex flex-col gap-2">
                <FormField
                  field="password"
                  type="password"
                  autoComplete="current-password"
                  value={values.password}
                  error={errors.password}
                  inputRef={passwordRef}
                  onChange={handleChange("password")}
                />
                <Link
                  to="/auth/forgot-password"
                  className="self-end text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t text-sm text-muted-foreground">
            <span>New here?</span>
            <Link
              to="/auth/sign-up"
              className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
