import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

// Manages the Supabase Auth session for the PWA build. In the Claude Artifact build
// there's no Supabase config at all (no VITE_* env vars under esbuild), so this
// short-circuits to a stub "signed-in" state — the artifact platform provides its
// own storage and has no login concept, so nothing downstream should ever gate on it.
export function useAuth() {
  const [status, setStatus] = useState(isSupabaseConfigured ? "checking" : "signed-in"); // checking | signed-out | signed-in | error
  const [user, setUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }
      setUser(data.session?.user ?? null);
      setStatus(data.session ? "signed-in" : "signed-out");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setStatus(session ? "signed-in" : "signed-out");
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signInWithPassword(email, password) {
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
      throw error;
    }
  }

  async function signUpWithPassword(email, password) {
    setErrorMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setErrorMsg(error.message);
      throw error;
    }
  }

  async function signInWithOtp(email) {
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setErrorMsg(error.message);
      throw error;
    }
  }

  async function signOut() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }

  async function updatePassword(newPassword) {
    setErrorMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setErrorMsg(error.message);
      throw error;
    }
  }

  return { configured: isSupabaseConfigured, status, user, errorMsg, signInWithPassword, signUpWithPassword, signInWithOtp, signOut, updatePassword };
}
