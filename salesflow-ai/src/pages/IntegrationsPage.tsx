import React, { useEffect, useState } from "react";
import { Copy, ExternalLink, Key, Plus, Trash2, Zap } from "lucide-react";

type ApiKey = {
  id: string;
  key_prefix: string;
  name: string;
  scopes?: string[];
  created_at?: string;
  last_used_at?: string | null;
};

export default function IntegrationsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/zapier/api-keys`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await res.json();
      setApiKeys(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/zapier/api-keys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Zapier" }),
    });
    const data = await res.json();
    setNewKey(data.api_key);
    fetchApiKeys();
  };

  const revokeKey = async (id: string) => {
    if (!window.confirm("API Key wirklich löschen?")) return;
    await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/zapier/api-keys/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    });
    fetchApiKeys();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Integrationen</h1>
          <p className="text-gray-500">Verbinde SalesFlow mit 5000+ Apps</p>
        </div>
        <a
          href="https://zapier.com/apps/salesflow/integrations"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Zap className="w-4 h-4" />
          Zapier öffnen
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* API Keys Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Keys
          </h2>
          <button
            onClick={createKey}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Neuer Key
          </button>
        </div>

        {/* New Key Warning */}
        {newKey && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Kopiere diesen Key jetzt - er wird nicht wieder angezeigt!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-white dark:bg-gray-800 rounded font-mono text-sm">{newKey}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  alert("Kopiert!");
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Keys List */}
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="text-sm text-gray-500 font-mono">{key.key_prefix}•••••••••</p>
                <p className="text-xs text-gray-400">
                  Erstellt:{" "}
                  {key.created_at ? new Date(key.created_at).toLocaleDateString("de-DE") : "–"}
                  {key.last_used_at &&
                    ` • Zuletzt: ${new Date(key.last_used_at).toLocaleDateString("de-DE")}`}
                </p>
              </div>
              <button
                onClick={() => revokeKey(key.id)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {apiKeys.length === 0 && !loading && (
            <p className="text-center text-gray-500 py-4">Noch keine API Keys erstellt</p>
          )}
        </div>
      </div>

      {/* Available Triggers & Actions */}
      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-3">⚡ Triggers (Wenn...)</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>• Neuer Lead erstellt</li>
            <li>• Lead Status geändert</li>
            <li>• Deal gewonnen</li>
            <li>• Aufgabe erledigt</li>
          </ul>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-3">🎯 Actions (Dann...)</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>• Lead erstellen</li>
            <li>• Lead aktualisieren</li>
            <li>• Aufgabe erstellen</li>
            <li>• Aktivität hinzufügen</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

