import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

export default function LoginPage() {
  const { user, signIn, loading, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  if (!loading && user) return <Navigate to="/admin" replace />;
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { error: authError } = await signIn(email.trim(), password);
    setBusy(false);
    if (authError) {
      setError("Não foi possível entrar. Confira seu e-mail e senha.");
      return;
    }
    navigate(location.state?.from || "/admin", { replace: true });
  }

  return <main className="auth-shell">
    <form className="auth-card" onSubmit={submit}>
      <p className="auth-eyebrow">DOM FORMÁGIO NA SERRA</p>
      <h1>Acesso da equipe</h1>
      <p>Entre com as credenciais fornecidas pelo administrador.</p>
      {!configured && <p className="auth-error" role="alert">O login ainda não foi conectado ao Supabase neste ambiente. Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na hospedagem.</p>}
      <label>E-mail<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={busy || !configured}>{busy ? "Entrando..." : "Entrar"}</button>
      <a href="/">Voltar ao cardápio</a>
    </form>
  </main>;
}
