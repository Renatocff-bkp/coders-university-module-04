import { Navigate, Route, Routes } from "react-router-dom";

import StatusPage from "./routes/status-page";
import HomePlaceholder from "./routes/home-placeholder";
import SignInPage from "./modules/auth/pages/sign-in-page";
import CheckEmailPage from "./modules/auth/pages/check-email-page";
import ConfirmAccountPage from "./modules/auth/pages/confirm-account-page";
import SignUpPage from "./modules/auth/pages/sign-up-page";
import { RequireAuth } from "./routes/require-auth";
import { useAuth } from "./modules/auth/AuthProvider";

function RootRedirect() {
  const { status } = useAuth();

  if (status === "authenticated") {
    return <Navigate to="/app" replace />;
  }

  return <Navigate to="/auth/sign-in" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth/sign-in" element={<SignInPage />} />
      <Route path="/auth/sign-up" element={<SignUpPage />} />
      <Route path="/auth/check-email" element={<CheckEmailPage />} />
      <Route path="/auth/confirm-account" element={<ConfirmAccountPage />} />
      <Route path="/app" element={<RequireAuth />}>
        <Route index element={<HomePlaceholder />} />
        <Route path="status" element={<StatusPage />} />
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
