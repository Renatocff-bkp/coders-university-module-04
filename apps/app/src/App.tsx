import { Navigate, Route, Routes } from "react-router-dom";

import StatusPage from "./routes/status-page";
import HomePlaceholder from "./routes/home-placeholder";
import SignInPage from "./routes/sign-in-page";
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
      <Route path="/app" element={<RequireAuth />}>
        <Route index element={<HomePlaceholder />} />
        <Route path="status" element={<StatusPage />} />
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
