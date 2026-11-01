import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@repo/ui";

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
    <main className="min-h-dvh bg-linen text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16 sm:py-24">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Workspace
          </p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Welcome, {firstName}
          </h1>
          <p className="max-w-prose text-base text-muted-foreground">
            Home placeholder — the authenticated area is on its way.
          </p>
        </header>
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </div>
    </main>
  );
}
