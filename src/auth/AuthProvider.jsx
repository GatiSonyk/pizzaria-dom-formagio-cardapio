import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setLoading(false);
      return () => { active = false; };
    }

    async function loadProfile(user) {
      if (!user) {
        if (active) setProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();
      if (active) {
        if (error) console.error("Falha ao carregar perfil:", error.message);
        setProfile(error ? null : data);
      }
    }

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) console.error("Falha ao recuperar sessão:", error.message);
      setSession(data?.session ?? null);
      await loadProfile(data?.session?.user ?? null);
      if (active) setLoading(false);
    }).catch((error) => {
      if (active) {
        console.error("Falha ao inicializar autenticação:", error);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
        // Keep protected routes in the loading state until the role query finishes.
        setLoading(true);
        setTimeout(async () => {
          if (!active) return;
          await loadProfile(nextSession.user);
          if (active) setLoading(false);
        }, 0);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    configured: Boolean(supabase),
    signIn: (email, password) => supabase
      ? supabase.auth.signInWithPassword({ email, password })
      : Promise.resolve({ error: new Error("Supabase não está configurado neste ambiente.") }),
    signOut: () => supabase
      ? supabase.auth.signOut()
      : Promise.resolve({ error: null }),
    refreshProfile: async () => {
      if (!supabase || !session?.user) return;
      const { data, error } = await supabase.from("profiles")
        .select("id, full_name, role").eq("id", session.user.id).maybeSingle();
      if (!error) setProfile(data);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return value;
}
