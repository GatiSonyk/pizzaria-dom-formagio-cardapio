import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main className="auth-shell"><p>Verificando acesso...</p></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) return <main className="auth-shell"><h1>Perfil não encontrado</h1><p>Peça ao administrador para verificar seu cadastro.</p></main>;
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <main className="auth-shell"><h1>Acesso não autorizado</h1><p>Seu perfil não tem permissão para esta área.</p><a href="/">Voltar ao cardápio</a></main>;
  }
  return <Outlet />;
}
