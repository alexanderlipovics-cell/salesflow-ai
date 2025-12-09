import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmailComposer from "../components/EmailComposer";

const EmailsPage = () => {
  const [searchParams] = useSearchParams();
  const leadIdFromUrl = searchParams.get("leadId");
  const [emails, setEmails] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [activeEmail, setActiveEmail] = useState(null);

  useEffect(() => {
    loadAccounts();
    loadEmails(leadIdFromUrl);
  }, [leadIdFromUrl]);

  const loadAccounts = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/emails/accounts`,
        { credentials: "include" }
      );
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (e) {
      console.error("Accounts konnten nicht geladen werden", e);
    }
  };

  const loadEmails = async (leadId) => {
    setLoading(true);
    try {
      const query = leadId ? `?lead_id=${leadId}` : "";
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/emails/${query}`,
        { credentials: "include" }
      );
      const data = await res.json();
      setEmails(data.emails || []);
      if (data.emails?.length) {
        setActiveEmail(data.emails[0]);
      }
    } catch (e) {
      console.error("E-Mails konnten nicht geladen werden", e);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/emails/sync`,
        { method: "POST", credentials: "include" }
      );
      await loadEmails(leadIdFromUrl);
    } catch (e) {
      console.error("Sync fehlgeschlagen", e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">E-Mail Inbox</h1>
          <p className="text-sm text-gray-400">
            Synchronisierte Nachrichten (Gmail & Outlook) – klick für Details.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowComposer(true)}
            className="rounded-xl bg-salesflow-accent px-4 py-2 text-sm font-semibold text-white hover:bg-salesflow-accent/80"
          >
            ✉️ Neue E-Mail
          </button>
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:border-white/40 disabled:opacity-60"
          >
            {syncing ? "Synchronisiere..." : "Sync starten"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {loading ? "Lade..." : `${emails.length} Nachrichten`}
            </div>
            {leadIdFromUrl && (
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white">
                Filter: Lead {leadIdFromUrl}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {emails.map((mail) => (
              <div
                key={mail.id}
                onClick={() => setActiveEmail(mail)}
                className={`cursor-pointer rounded-2xl border border-white/5 bg-black/30 p-4 hover:border-salesflow-accent/50 ${
                  activeEmail?.id === mail.id ? "border-salesflow-accent/70" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{mail.subject || "(Kein Betreff)"}</div>
                    <div className="text-xs text-gray-400">
                      {mail.direction === "outbound" ? "Gesendet" : "Eingang"} • {mail.from_email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-200">
                      Opens: {mail.open_count || 0}
                    </span>
                    <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-200">
                      Clicks: {mail.click_count || 0}
                    </span>
                  </div>
                </div>
                <div className="mt-2 line-clamp-2 text-sm text-gray-300">{mail.snippet}</div>
              </div>
            ))}
            {!emails.length && !loading && (
              <div className="rounded-2xl border border-white/5 bg-black/30 p-6 text-center text-gray-400">
                Keine E-Mails gefunden. Starte einen Sync oder sende deine erste E-Mail.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Verbunden</div>
              <a
                href="/settings/email"
                className="text-xs text-salesflow-accent hover:underline"
              >
                Konten verwalten
              </a>
            </div>
            {accounts.length ? (
              <div className="space-y-2 text-sm text-gray-200">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                    <div>
                      <div className="font-semibold">{acc.email}</div>
                      <div className="text-xs text-gray-400">{acc.provider}</div>
                    </div>
                    {acc.last_sync_at ? (
                      <span className="text-xs text-gray-500">
                        {new Date(acc.last_sync_at).toLocaleString("de-AT")}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Nie synchronisiert</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">Noch kein Konto verbunden.</div>
            )}
          </div>

          {activeEmail && (
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <div className="text-sm font-semibold text-white">{activeEmail.subject || "(Kein Betreff)"}</div>
              <div className="text-xs text-gray-400">
                {activeEmail.from_email} → {(activeEmail.to_emails || []).join(", ")}
              </div>
              <div className="mt-3 rounded-xl border border-white/5 bg-white/5 p-3 text-sm text-gray-200">
                {activeEmail.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: activeEmail.body_html }} />
                ) : (
                  activeEmail.snippet || "Keine Vorschau verfügbar."
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <EmailComposer
        isOpen={showComposer}
        onClose={() => setShowComposer(false)}
        leadId={leadIdFromUrl}
        onSent={() => loadEmails(leadIdFromUrl)}
      />
    </div>
  );
};

export default EmailsPage;

