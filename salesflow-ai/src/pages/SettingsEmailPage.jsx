import { useEffect, useState } from "react";
import { Mail, Check, X, ExternalLink, RefreshCw } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "https://salesflow-ai.onrender.com";

export const EmailIntegrationSection = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkGmailStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected")) {
      checkGmailStatus();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const checkGmailStatus = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/api/auth/google/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error checking Gmail status:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = async () => {
    setConnecting(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/api/auth/google/connect?redirect_url=/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      window.location.href = data.auth_url;
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      setConnecting(false);
    }
  };

  const disconnectGmail = async () => {
    if (!confirm("Gmail-Verbindung wirklich trennen?")) return;

    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${API_URL}/api/auth/google/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus({ connected: false });
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 border rounded-lg animate-pulse bg-white/5 border-white/10">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-2" />
        <div className="h-4 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-black/40 border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status?.connected ? "bg-green-100" : "bg-gray-100"}`}>
            <Mail className={`w-5 h-5 ${status?.connected ? "text-green-600" : "text-gray-500"}`} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Gmail Integration</h3>
            {status?.connected ? (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Verbunden mit {status.email}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-300">Verbinde Gmail um Emails zu synchronisieren</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status?.connected ? (
            <>
              <button
                onClick={checkGmailStatus}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-white/10"
                title="Status aktualisieren"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={disconnectGmail}
                className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm"
              >
                Trennen
              </button>
            </>
          ) : (
            <button
              onClick={connectGmail}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Gmail verbinden
            </button>
          )}
        </div>
      </div>

      {status?.last_sync && (
        <p className="text-xs text-gray-400 mt-2">
          Letzte Synchronisation: {new Date(status.last_sync).toLocaleString("de-DE")}
        </p>
      )}
    </div>
  );
};

const SettingsEmailPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/emails/accounts`,
        { credentials: "include" }
      );
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (e) {
      console.error("Konten konnten nicht geladen werden", e);
    } finally {
      setLoading(false);
    }
  };

  const connect = async (provider) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/emails/connect/${provider}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (e) {
      console.error("OAuth-Start fehlgeschlagen", e);
    }
  };

  const disconnect = async (id) => {
    await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/emails/accounts/${id}`,
      { method: "DELETE", credentials: "include" }
    );
    await loadAccounts();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">E-Mail Konten</h1>
        <p className="text-sm text-gray-400">
          Verbinde Gmail oder Outlook, um Nachrichten zu synchronisieren und direkt aus dem CRM zu senden.
        </p>
      </div>

      <EmailIntegrationSection />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-black/30 p-6 space-y-3">
          <div className="text-lg font-semibold text-white">Verbinden</div>
          <button
            onClick={() => connect("gmail")}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-gray-200"
          >
            Mit Gmail verbinden
          </button>
          <button
            onClick={() => connect("outlook")}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Mit Outlook verbinden
          </button>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/30 p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-lg font-semibold text-white">Verbundene Konten</div>
            <div className="text-xs text-gray-400">{loading ? "Lade..." : `${accounts.length} Konten`}</div>
          </div>

          {accounts.length ? (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3">
                  <div>
                    <div className="font-semibold text-white">{acc.email}</div>
                    <div className="text-xs text-gray-400">{acc.provider}</div>
                    <div className="text-xs text-gray-500">
                      Letzter Sync: {acc.last_sync_at ? new Date(acc.last_sync_at).toLocaleString("de-AT") : "nie"}
                    </div>
                  </div>
                  <button
                    onClick={() => disconnect(acc.id)}
                    className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs text-rose-400 hover:border-rose-500"
                  >
                    Trennen
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-gray-400">
              Noch kein Konto verbunden. Starte oben mit Gmail oder Outlook.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsEmailPage;

