import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "../App.jsx";
import { AuthProvider } from "./AuthProvider.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import LoginPage from "./LoginPage.jsx";
import AdminPage from "./AdminPage.jsx";

export default function AuthRoutes() {
  return <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute allowedRoles={["administrador", "equipe"]} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["administrador", "equipe", "usuario"]} />}>
          <Route path="/conta" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>;
}
