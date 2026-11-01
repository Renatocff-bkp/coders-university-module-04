import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@repo/ui";

import { confirmAccount } from "../api/confirm-account";
import { useAuth } from "../AuthProvider";
import { AuthLayout } from "../../../components/auth-layout";

const INVALID_LINK_MESSAGE =
  "This confirmation link is invalid, expired or has already been used.";

export default function ConfirmAccountPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { saveToken } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    const token = searchParams.get("token")?.trim() ?? "";

    setSearchParams({}, { replace: true });

    if (!token) {
      setErrorMessage(INVALID_LINK_MESSAGE);

      return;
    }

    confirmAccount(token)
      .then(({ token: sessionToken }) => {
        saveToken(sessionToken);
        navigate("/app", { replace: true });
      })
      .catch(() => {
        setErrorMessage(INVALID_LINK_MESSAGE);
      });
  }, [searchParams, setSearchParams, saveToken, navigate]);

  return (
    <AuthLayout
      eyebrow="Authentication"
      title="Confirm your account"
      description="We are activating your account and signing you in."
    >
      <Card className="border-border/60 shadow-sm">
        {errorMessage === null ? (
          <>
            <CardHeader className="gap-3">
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-6"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <CardTitle className="text-lg">Confirming your email</CardTitle>
              <CardDescription>
                Hold on while we activate your account and sign you in.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col gap-3"
              >
                <span className="sr-only">Confirming your account</span>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="gap-3">
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-6"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6m0-6 6 6" />
                </svg>
              </div>
              <CardTitle className="text-lg">
                We could not confirm your account
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <p>{errorMessage}</p>
              </div>
            </CardContent>

            <div className="px-6 pb-6">
              <Button asChild variant="outline" className="h-10 w-full">
                <Link to="/auth/sign-in">Go to sign in</Link>
              </Button>
            </div>
          </>
        )}
      </Card>
    </AuthLayout>
  );
}
