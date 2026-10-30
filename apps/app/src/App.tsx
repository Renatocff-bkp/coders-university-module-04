import { Navigate, Route, Routes } from "react-router-dom";

import StatusPage from "./routes/status-page";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/app" element={<StatusPage />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
