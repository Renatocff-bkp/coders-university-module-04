import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../modules/auth/AuthProvider";

export function RequireAuth() {
  const { status } = useAuth();

  if (status === "loading") {
    return null;
  }

  if (status !== "authenticated") {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return <Outlet />;
}
