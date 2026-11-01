import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";

import { signOut } from "../modules/auth/api/sign-out";
import { useAuth } from "../modules/auth/AuthProvider";

export default function HomePlaceholder() {
  const navigate = useNavigate();
  const { user, token, clearToken } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const firstName = user?.firstName ?? "there";

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);

    try {
      if (token) {
        await signOut(token);
      }
    } catch {
      // The local session is cleared even if the revocation request fails.
    } finally {
      clearToken();
      navigate("/auth/sign-in", { replace: true });
    }
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M12 2l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 9l6-1 3-6z" />
              </svg>
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Coders University
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="mb-8">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Workspace
          </p>
          <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 max-w-prose text-base text-muted-foreground">
            Your authenticated area is on its way. Explore the tools below to
            get started.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/60 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">System status</CardTitle>
              <CardDescription>
                Live checks for the local API and services.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="h-10">
                <Link to="/app/status">Open status page</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Your account</CardTitle>
              <CardDescription>
                Signed in as {user?.email ?? "—"}. Manage your session below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
