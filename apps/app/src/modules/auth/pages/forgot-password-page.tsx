import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button, Card, CardContent, Input, Label } from "@repo/ui";

import { ApiError } from "../../../shared/api-client";
import { forgotPassword } from "../api/forgot-password";
import { validateEmail } from "../validation";
import { AuthLayout } from "../../../components/auth-layout";

const GENERIC_ERROR_MESSAGE =
  "We could not send the reset link. Please try again.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setConfirmation(null);

    const validationError = validateEmail(email);

    setFieldError(validationError ?? null);

    if (validationError) {
      emailRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await forgotPassword(email.trim());
      setConfirmation(response.message);
    } catch (error) {
      if (error instanceof ApiError && error.fields?.length) {
        setFieldError(
          error.fields[0]?.messages?.[0] ?? "Enter a valid email address.",
        );
        emailRef.current?.focus();
      } else {
        setFormError(GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Authentication"
      title="Forgot your password?"
      description="We will send you a link to choose a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link
            to="/auth/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-6">
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

            {confirmation ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground"
              >
                <p>{confirmation}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldError(null);
                }}
                ref={emailRef}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? "email-error" : undefined}
                className="h-11"
              />
              {fieldError ? (
                <p
                  id="email-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {fieldError}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full"
            >
              {isSubmitting ? "Sending link…" : "Send reset link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
