import React, { useState } from "react";
import { X, UserPlus, GitBranch, Award } from "lucide-react";
import { ZINZINO_RANKS } from "../../config/zinzinoRanks";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Props {
  lead: Lead;
  onClose: () => void;
  onConvert: (data: any) => void;
}

export default function LeadToPartnerModal({ lead, onClose, onConvert }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    leg: "left" as "left" | "right",
    rank: 0,
    personal_credits: 0,
    notes: "",
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/network/convert-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          ...data,
        }),
      });

      if (response.ok) {
        onConvert({ lead, ...data });
        onClose();
      }
    } catch (error) {
      console.error("Conversion failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lead zu Partner
              </h2>
              <p className="text-sm text-gray-500">{lead.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              In welches Bein?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setData({ ...data, leg: "left" })}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                  data.leg === "left"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <GitBranch className="w-6 h-6 text-blue-500 mb-1" />
                <span className="font-medium">Links</span>
              </button>
              <button
                onClick={() => setData({ ...data, leg: "right" })}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                  data.leg === "right"
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <GitBranch className="w-6 h-6 text-purple-500 mb-1 transform scale-x-[-1]" />
                <span className="font-medium">Rechts</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start-Rang
            </label>
            <select
              value={data.rank}
              onChange={(e) => setData({ ...data, rank: parseInt(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            >
              {ZINZINO_RANKS.slice(0, 5).map((rank) => (
                <option key={rank.id} value={rank.id}>
                  {rank.icon} {rank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start-Credits (optional)
            </label>
            <input
              type="number"
              min="0"
              value={data.personal_credits || ""}
              onChange={(e) =>
                setData({ ...data, personal_credits: parseInt(e.target.value) || 0 })
              }
              placeholder="z.B. 50"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notizen (optional)
            </label>
            <textarea
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
              placeholder="z.B. Über Instagram kennengelernt..."
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 resize-none"
            />
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
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? "Speichern..." : "Konvertieren"}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Der Lead wird zu deinem Team hinzugefügt und aus der Lead-Liste entfernt.
        </p>
      </div>
    </div>
  );
}

