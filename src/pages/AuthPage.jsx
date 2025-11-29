import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabase";

const AuthPage = () => {
  const supabaseReady = isSupabaseConfigured();
  const {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated,
  } = useAuth();
  const [mode, setMode] = useState("signin");
  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const featureHighlights = useMemo(
    () => [
      "Single Sign-On via Supabase Auth",
      "Direkte Weiterleitung in Sales Flow",
      "Support für Magic Links & Password",
    ],
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!supabaseReady) {
      setStatus({
        type: "error",
        message:
          "Supabase ist noch nicht konfiguriert. Hinterlege URL & Key in Vite env.",
      });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      if (mode === "signin") {
        const { error } = await signIn(
          formValues.email,
          formValues.password
        );
        if (error) throw error;
        setStatus({
          type: "success",
          message: "Login erfolgreich – du wirst gleich weitergeleitet.",
        });
      } else {
        const { error } = await signUp(
          formValues.email,
          formValues.password,
          formValues.fullName
        );
        if (error) throw error;
        setStatus({
          type: "success",
          message: "Account erstellt – bestätige bitte deine E-Mail.",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error.message ||
          "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setStatus(null);
  };

  const handleSignOut = async () => {
    await signOut();
    setStatus({
      type: "success",
      message: "Du hast dich abgemeldet.",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-950/90 to-black px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-3 text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.6em] text-gray-500">
            Sales Flow AI · Auth
          </p>
          <h1 className="text-4xl font-semibold">
            Zugriff auf das Sales Flow Command Center
          </h1>
          <p className="text-base text-gray-400">
            Verbinde deinen Account mit Supabase Auth. Wähle Login oder
            Registrierung, um sofort loszulegen.
          </p>
        </header>

        <div className="grid gap-8 rounded-3xl border border-white/5 bg-white/5/60 p-6 backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-10">
          <section className="space-y-6 rounded-3xl border border-white/5 bg-gray-950/60 p-6">
            <p className="text-xs uppercase tracking-[0.5em] text-gray-500">
              Warum Supabase?
            </p>
            <h2 className="text-2xl font-semibold">
              Sichere Auth & sofortige Provisionierung
            </h2>
            <p className="text-sm text-gray-400">
              Wir nutzen Supabase Auth, um Accounts in Echtzeit anzulegen und
              Feature-Gates sofort zu synchronisieren.
            </p>
            <ul className="space-y-4">
              {featureHighlights.map((highlight) => (
                <li
                  key={highlight}
                  className="flex items-start gap-3 rounded-2xl border border-white/5 bg-black/30 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-salesflow-accent" />
                  <span className="text-sm text-gray-200">{highlight}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm text-gray-300">
              <p className="font-semibold text-white">Aktueller Status</p>
              <p className="mt-2 text-sm text-gray-400">
                {supabaseReady
                  ? "Supabase ist verbunden. Du kannst dich anmelden oder registrieren."
                  : "Keine Supabase-Umgebung gefunden. Bitte .env.local mit VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY ausstatten."}
              </p>
              {isAuthenticated && user && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">
                    Eingeloggt
                  </p>
                  <p className="mt-2 font-semibold text-white">{user.email}</p>
                  {user.user_metadata?.full_name && (
                    <p className="text-emerald-200">
                      {user.user_metadata.full_name}
                    </p>
                  )}
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 hover:bg-emerald-400/10"
                    onClick={handleSignOut}
                  >
                    Abmelden
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6 rounded-3xl border border-white/5 bg-gray-950/80 p-6">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 p-1 text-sm text-gray-400">
              <button
                type="button"
                onClick={() => handleModeChange("signin")}
                className={`flex-1 rounded-full px-4 py-2 font-semibold ${
                  mode === "signin"
                    ? "bg-salesflow-accent text-black shadow-glow"
                    : "text-gray-400"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("signup")}
                className={`flex-1 rounded-full px-4 py-2 font-semibold ${
                  mode === "signup"
                    ? "bg-salesflow-accent text-black shadow-glow"
                    : "text-gray-400"
                }`}
              >
                Registrieren
              </button>
            </div>

            {status && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  status.type === "error"
                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                {status.message}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <label className="block text-sm">
                  <span className="text-xs uppercase tracking-[0.4em] text-gray-500">
                    Vollständiger Name
                  </span>
                  <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      name="fullName"
                      value={formValues.fullName}
                      onChange={handleChange}
                      autoComplete="name"
                      placeholder="Lena Schuster"
                      className="w-full bg-transparent text-white outline-none"
                      required
                      disabled={submitting}
                    />
                  </div>
                </label>
              )}

              <label className="block text-sm">
                <span className="text-xs uppercase tracking-[0.4em] text-gray-500">
                  E-Mail
                </span>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    name="email"
                    value={formValues.email}
                    onChange={handleChange}
                    autoComplete="email"
                    placeholder="du@company.com"
                    className="w-full bg-transparent text-white outline-none"
                    required
                    disabled={submitting}
                  />
                </div>
              </label>

              <label className="block text-sm">
                <span className="text-xs uppercase tracking-[0.4em] text-gray-500">
                  Passwort
                </span>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                  <Lock className="h-4 w-4 text-gray-500" />
                  <input
                    type="password"
                    name="password"
                    value={formValues.password}
                    onChange={handleChange}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    placeholder="••••••••"
                    className="w-full bg-transparent text-white outline-none"
                    required
                    minLength={6}
                    disabled={submitting}
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-salesflow-accent px-4 py-3 text-base font-semibold text-black shadow-glow hover:scale-[1.01] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {mode === "signin" ? "Login läuft..." : "Account wird erstellt..."}
                  </>
                ) : mode === "signin" ? (
                  <>
                    Einloggen
                    <ArrowRight className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    Account anlegen
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500">
              {mode === "signin" ? (
                <>
                  Noch keinen Zugang?{" "}
                  <button
                    type="button"
                    onClick={() => handleModeChange("signup")}
                    className="text-salesflow-accent hover:underline"
                  >
                    Account erstellen
                  </button>
                </>
              ) : (
                <>
                  Bereits registriert?{" "}
                  <button
                    type="button"
                    onClick={() => handleModeChange("signin")}
                    className="text-salesflow-accent hover:underline"
                  >
                    Hier einloggen
                  </button>
                </>
              )}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
