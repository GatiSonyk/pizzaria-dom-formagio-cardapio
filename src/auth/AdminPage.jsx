import { useAuth } from "./AuthProvider.jsx";

export default function AdminPage() {
  const { user, profile, signOut } = useAuth();
  async function logout() {
    const { error } = await signOut();
    if (error) window.alert("Não foi possível sair. Tente novamente.");
    else window.location.assign("/login");
  }
  return <main className="auth-shell">
    <section className="auth-card auth-dashboard">
      <p className="auth-eyebrow">DOM FORMÁGIO NA SERRA</p>
      <h1>Área interna</h1>
      <p>Autenticação realizada com sucesso.</p>
      <dl><dt>Conta</dt><dd>{user?.email}</dd><dt>Perfil</dt><dd>{profile?.role}</dd></dl>
      {profile?.full_name && <p>Olá, {profile.full_name}.</p>}
      <p className="auth-muted">Esta área está protegida por sessão e perfil. Os módulos administrativos podem ser conectados aqui sem alterar o cardápio público.</p>
      <button className="auth-submit" onClick={logout}>Sair</button>
      <a href="/">Abrir cardápio público</a>
    </section>
  </main>;
}
