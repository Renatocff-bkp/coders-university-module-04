import { Navigate, Outlet } from "react-router-dom";

import { Skeleton } from "@repo/ui";

import { useAuth } from "../modules/auth/AuthProvider";

export function RequireAuth() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex w-full max-w-sm flex-col gap-3 px-6">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return <Outlet />;
}
