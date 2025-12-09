import { useEffect, useState } from "react";

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

