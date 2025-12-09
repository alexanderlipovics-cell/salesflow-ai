import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && window.location.hash.includes("type=recovery")) {
        setIsValidToken(true);
      } else if (session) {
        setIsValidToken(true);
      } else {
        setError("Ungültiger oder abgelaufener Link. Bitte fordere einen neuen an.");
      }
      setChecking(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidToken(true);
        setChecking(false);
      }
    });

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen haben");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Überprüfe Link...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-4">✅ Passwort geändert!</h1>
          <p className="text-slate-300">Du wirst zum Login weitergeleitet...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-4">❌ Link ungültig</h1>
          <p className="text-slate-300 mb-6">{error}</p>
          <Button onClick={() => navigate("/forgot-password")} className="bg-emerald-500">
            Neuen Link anfordern
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-2">Neues Passwort setzen</h1>
        <p className="text-slate-400 mb-6">Gib dein neues Passwort ein.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Neues Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <input
            type="password"
            placeholder="Passwort bestätigen"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
            {loading ? "Speichern..." : "Passwort speichern"}
          </Button>
        </form>
      </div>
    </div>
  );
}

