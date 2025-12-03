import { useState } from "react";
import {
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const featureHighlights = [
  "Supabase Auth mit E-Mail & Passwort",
  "Schnelle Provisionierung für Sales Flow",
  "Direkte Weiterleitung nach Login",
];

const AuthPage = () => {
  const { user, loading, signIn, signUp, signOut, isAuthenticated } = useAuth();
  const [mode, setMode] = useState("login");
  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      if (mode === "login") {
        const { error } = await signIn(formValues.email, formValues.password);
        if (error) throw error;
        setStatus({
          type: "success",
          message: "Willkommen zurück. Du wirst gleich weitergeleitet.",
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
          message: "Account angelegt. Bitte bestätige deine E-Mail.",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error.message ??
          "Supabase Auth konnte nicht erreicht werden. Bitte versuche es erneut.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setStatus(null);
    setFormValues((prev) => ({
      ...prev,
      password: "",
      ...(nextMode === "login" ? { fullName: "" } : {}),
    }));
  };

  const handleSignOut = async () => {
    await signOut();
    setStatus({
      type: "success",
      message: "Du hast dich erfolgreich abgemeldet.",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 px-4 py-12 text-white">
      <div className="mx-auto grid w-full max-w-4xl gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md md:grid-cols-2 md:p-10">
        <section className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Sales Flow Auth
            </p>
            <h1 className="text-3xl font-semibold leading-tight">
              Logge dich ein oder erstelle einen neuen Account
            </h1>
            <p className="text-sm text-slate-300">
              Supabase Auth verbindet dich sicher mit allen Sales Flow Features.
            </p>
          </div>

          <ul className="space-y-3">
            {featureHighlights.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-slate-200"
              >
                {item}
              </li>
            ))}
          </ul>

          {isAuthenticated && user && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">
                Eingeloggt
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {user.email}
              </p>
              {user.user_metadata?.full_name && (
                <p className="text-sm text-emerald-200">
                  {user.user_metadata.full_name}
                </p>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 hover:bg-emerald-400/10"
              >
                <LogOut className="h-4 w-4" />
                Abmelden
              </button>
            </div>
          )}
        </section>

        <section className="space-y-6 rounded-3xl border border-white/10 bg-black/50 p-6">
          <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm">
            <button
              type="button"
              onClick={() => handleModeChange("login")}
              className={`flex-1 rounded-full px-4 py-2 font-semibold ${
                mode === "login"
                  ? "bg-salesflow-accent text-black"
                  : "text-slate-400"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("register")}
              className={`flex-1 rounded-full px-4 py-2 font-semibold ${
                mode === "register"
                  ? "bg-salesflow-accent text-black"
                  : "text-slate-400"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Registrieren
              </span>
            </button>
          </div>

          {status && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                status.type === "error"
                  ? "border-red-400/40 bg-red-500/10 text-red-100"
                  : "border-emerald-400/40 bg-emerald-500/10 text-emerald-50"
              }`}
            >
              {status.message}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "register" && (
              <label className="block text-sm">
                <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  Vollständiger Name
                </span>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2">
                  <UserIcon className="h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    name="fullName"
                    value={formValues.fullName}
                    onChange={handleInputChange}
                    placeholder="Lena Schuster"
                    autoComplete="name"
                    required
                    disabled={submitting}
                    className="w-full bg-transparent text-white outline-none"
                  />
                </div>
              </label>
            )}

            <label className="block text-sm">
              <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
                E-Mail
              </span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  value={formValues.email}
                  onChange={handleInputChange}
                  placeholder="du@company.com"
                  autoComplete="email"
                  required
                  disabled={submitting}
                  className="w-full bg-transparent text-white outline-none"
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Passwort
              </span>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2">
                <Lock className="h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  name="password"
                  value={formValues.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={6}
                  required
                  disabled={submitting}
                  className="w-full bg-transparent text-white outline-none"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-salesflow-accent px-5 py-3 text-base font-semibold text-black shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {mode === "login"
                    ? "Login wird ausgeführt..."
                    : "Account wird erstellt..."}
                </>
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-5 w-5" />
                  Einloggen
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Account erstellen
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400">
            {mode === "login" ? (
              <>
                Kein Konto?{" "}
                <button
                  type="button"
                  onClick={() => handleModeChange("register")}
                  className="text-salesflow-accent hover:underline"
                >
                  Jetzt registrieren
                </button>
              </>
            ) : (
              <>
                Schon registriert?{" "}
                <button
                  type="button"
                  onClick={() => handleModeChange("login")}
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
  );
};

export default AuthPage;
