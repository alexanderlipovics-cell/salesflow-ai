import React, { useState, useEffect } from "react";
import { Save, RefreshCw } from "lucide-react";
import { ZINZINO_RANKS } from "../config/zinzinoRanks";
import CSVImport from "../components/network/CSVImport";

export default function NetworkSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    current_rank: 0,
    pcp: 0,
    personal_credits: 0,
    left_leg_credits: 0,
    right_leg_credits: 0,
    z4f_customers: 0,
    company: "zinzino",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/network/settings");
      const settings = await response.json();
      setData(settings);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/network/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Netzwerk Einstellungen</h1>
        <p className="text-gray-500 mb-8">
          Aktualisiere deine MLM Daten manuell oder importiere aus dem Backoffice
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Manuelle Eingabe</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Aktueller Rang
              </label>
              <select
                value={data.current_rank}
                onChange={(e) => setData({ ...data, current_rank: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              >
                {ZINZINO_RANKS.map((rank) => (
                  <option key={rank.id} value={rank.id}>
                    {rank.icon} {rank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                PCP (Persönliche Kundenpunkte)
              </label>
              <input
                type="number"
                value={data.pcp}
                onChange={(e) => setData({ ...data, pcp: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Persönliche Credits
              </label>
              <input
                type="number"
                value={data.personal_credits}
                onChange={(e) => setData({ ...data, personal_credits: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Z4F Kunden (0-4)</label>
              <input
                type="number"
                min="0"
                max="4"
                value={data.z4f_customers}
                onChange={(e) =>
                  setData({ ...data, z4f_customers: Math.min(4, parseInt(e.target.value) || 0) })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Linkes Bein (Credits)
              </label>
              <input
                type="number"
                value={data.left_leg_credits}
                onChange={(e) =>
                  setData({ ...data, left_leg_credits: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rechtes Bein (Credits)
              </label>
              <input
                type="number"
                value={data.right_leg_credits}
                onChange={(e) =>
                  setData({ ...data, right_leg_credits: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>

        <CSVImport onImportComplete={fetchSettings} />
      </div>
    </div>
  );
}

