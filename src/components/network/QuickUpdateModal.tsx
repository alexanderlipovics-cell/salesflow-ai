import React, { useState, useEffect } from "react";
import { X, Save, TrendingUp, GitBranch, Award, Zap } from "lucide-react";
import { ZINZINO_RANKS } from "../../config/zinzinoRanks";

interface Props {
  onClose: () => void;
  onSave: () => void;
}

export default function QuickUpdateModal({ onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    current_rank: 0,
    left_leg_credits: 0,
    right_leg_credits: 0,
    pcp: 0,
    z4f_customers: 0,
  });

  useEffect(() => {
    fetchCurrentData();
  }, []);

  const fetchCurrentData = async () => {
    try {
      const response = await fetch("/api/network/settings");
      const settings = await response.json();
      setData({
        current_rank: settings.current_rank || 0,
        left_leg_credits: settings.left_leg_credits || 0,
        right_leg_credits: settings.right_leg_credits || 0,
        pcp: settings.pcp || 0,
        z4f_customers: settings.z4f_customers || 0,
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch("/api/network/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      localStorage.setItem("lastMLMSync", new Date().toISOString());

      onSave();
      onClose();
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentRank = ZINZINO_RANKS[data.current_rank];
  const balancedCredits = Math.min(data.left_leg_credits, data.right_leg_credits) * 2;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Update</h2>
              <p className="text-sm text-gray-500">Aktualisiere deine wichtigsten Zahlen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Award className="w-4 h-4" />
              Aktueller Rang
            </label>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentRank?.icon}</span>
              <select
                value={data.current_rank}
                onChange={(e) => setData({ ...data, current_rank: parseInt(e.target.value) })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              >
                {ZINZINO_RANKS.map((rank) => (
                  <option key={rank.id} value={rank.id}>
                    {rank.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <GitBranch className="w-4 h-4" />
              Team Credits
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-500 mb-1 block">Links</span>
                <input
                  type="number"
                  min="0"
                  value={data.left_leg_credits || ""}
                  onChange={(e) =>
                    setData({ ...data, left_leg_credits: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div>
                <span className="text-xs text-gray-500 mb-1 block">Rechts</span>
                <input
                  type="number"
                  min="0"
                  value={data.right_leg_credits || ""}
                  onChange={(e) =>
                    setData({ ...data, right_leg_credits: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
            </div>
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
              <span className="text-sm text-gray-500">Balanced Credits:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{balancedCredits}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                PCP
              </label>
              <input
                type="number"
                min="0"
                value={data.pcp || ""}
                onChange={(e) => setData({ ...data, pcp: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Z4F Kunden
              </label>
              <input
                type="number"
                min="0"
                max="4"
                value={data.z4f_customers || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    z4f_customers: Math.min(4, parseInt(e.target.value) || 0),
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? "Speichern..." : "Speichern"}
          </button>
        </div>

        <p className="text-center mt-4">
          <a
            href="/network/settings"
            className="text-sm text-blue-600 hover:text-blue-700"
            onClick={onClose}
          >
            Alle Einstellungen & CSV Import →
          </a>
        </p>
      </div>
    </div>
  );
}

