import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@repo/ui";

import { confirmAccount } from "../api/confirm-account";
import { useAuth } from "../AuthProvider";

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
    <main className="min-h-dvh bg-linen text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Authentication
          </p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Confirm your account
          </h1>
        </header>

        <Card>
          {errorMessage === null ? (
            <>
              <CardHeader>
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
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
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

              <CardFooter className="justify-center border-t">
                <Button asChild variant="outline">
                  <Link to="/auth/sign-in">Go to sign in</Link>
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
