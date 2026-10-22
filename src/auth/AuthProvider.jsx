import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

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
        setProfile(error ? null : data);
      }
    }

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) console.error("Falha ao recuperar sessão:", error.message);
      setSession(data?.session ?? null);
      await loadProfile(data?.session?.user ?? null);
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }
      // Avoid awaiting network calls inside the Auth callback.
      setTimeout(() => { if (active) loadProfile(nextSession.user); }, 0);
      setLoading(false);
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
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    refreshProfile: async () => {
      if (!session?.user) return;
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
