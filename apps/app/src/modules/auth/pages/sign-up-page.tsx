import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from "react";
import { Link, useNavigate } from "react-router-dom";

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
import { signUp } from "../api/sign-up";
import {
  SIGN_UP_FIELD_ORDER,
  firstInvalidField,
  validateSignUpForm,
  type SignUpField,
  type SignUpFieldErrors,
  type SignUpFormValues,
} from "../validation";

const EMPTY_VALUES: SignUpFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  passwordConfirmation: "",
};

const FIELD_LABELS: Record<SignUpField, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  password: "Password",
  passwordConfirmation: "Confirm password",
};

interface FormFieldProps {
  field: SignUpField;
  type: "text" | "email" | "password";
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

function toServerFieldErrors(error: ApiError): SignUpFieldErrors | null {
  if (!error.fields || error.fields.length === 0) {
    return null;
  }

  const errors: SignUpFieldErrors = {};

  for (const fieldError of error.fields) {
    const field = fieldError.field as SignUpField;

    if (SIGN_UP_FIELD_ORDER.includes(field) && errors[field] === undefined) {
      errors[field] = fieldError.messages?.[0] ?? "This field is invalid.";
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<SignUpFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<SignUpFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmationRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<SignUpField, RefObject<HTMLInputElement | null>> = {
    firstName: firstNameRef,
    lastName: lastNameRef,
    email: emailRef,
    password: passwordRef,
    passwordConfirmation: passwordConfirmationRef,
  };

  const focusField = (field: SignUpField): void => {
    fieldRefs[field].current?.focus();
  };

  const handleChange =
    (field: SignUpField) =>
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

    const validationErrors = validateSignUpForm(values);
    setErrors(validationErrors);

    const firstInvalid = firstInvalidField(validationErrors);

    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    setIsSubmitting(true);

    try {
      await signUp({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      });
      navigate("/auth/check-email", { replace: true });
    } catch (error) {
      const serverErrors =
        error instanceof ApiError ? toServerFieldErrors(error) : null;

      if (serverErrors) {
        setErrors(serverErrors);
        const firstServerInvalid = firstInvalidField(serverErrors);

        if (firstServerInvalid) {
          focusField(firstServerInvalid);
        }
      }

      setFormError(
        serverErrors
          ? null
          : error instanceof ApiError
            ? error.message
            : "We could not create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className="min-h-dvh bg-linen text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Authentication
          </p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Create your account
          </h1>
          <p className="text-base text-muted-foreground">
            Start with your name, email and a secure password.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign up</CardTitle>
            <CardDescription>
              We will send a confirmation link to your inbox. Your account is
              only activated after you open it.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              className="flex flex-col gap-5"
              onSubmit={handleSubmit}
              noValidate
              aria-busy={isSubmitting}
            >
              {hasErrors || formError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {formError ? <p>{formError}</p> : null}
                  {hasErrors ? (
                    <>
                      <p>Please fix the highlighted fields.</p>
                      <ul className="mt-2 list-disc pl-5">
                        {SIGN_UP_FIELD_ORDER.filter(
                          (field) => errors[field] !== undefined,
                        ).map((field) => (
                          <li key={field}>{errors[field]}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  field="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={values.firstName}
                  error={errors.firstName}
                  inputRef={firstNameRef}
                  onChange={handleChange("firstName")}
                />
                <FormField
                  field="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={values.lastName}
                  error={errors.lastName}
                  inputRef={lastNameRef}
                  onChange={handleChange("lastName")}
                />
              </div>

              <FormField
                field="email"
                type="email"
                autoComplete="email"
                value={values.email}
                error={errors.email}
                inputRef={emailRef}
                onChange={handleChange("email")}
              />

              <FormField
                field="password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                error={errors.password}
                inputRef={passwordRef}
                onChange={handleChange("password")}
              />

              <FormField
                field="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                value={values.passwordConfirmation}
                error={errors.passwordConfirmation}
                inputRef={passwordConfirmationRef}
                onChange={handleChange("passwordConfirmation")}
              />

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t text-sm text-muted-foreground">
            <span>Already have an account?</span>
            <Link
              to="/auth/sign-in"
              className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
