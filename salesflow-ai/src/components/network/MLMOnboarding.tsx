import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  Users,
  GitBranch,
  Upload,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
} from "lucide-react";
import { ZINZINO_RANKS } from "../../config/zinzinoRanks";

interface OnboardingData {
  current_rank: number;
  team_size: number;
  left_leg_credits: number;
  right_leg_credits: number;
  z4f_customers: number;
  pcp: number;
  personal_credits: number;
}

const INITIAL_DATA: OnboardingData = {
  current_rank: 0,
  team_size: 0,
  left_leg_credits: 0,
  right_leg_credits: 0,
  z4f_customers: 0,
  pcp: 0,
  personal_credits: 0,
};

export default function MLMOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const totalSteps = 4;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/network/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        onComplete();
      }
    } catch (error) {
      console.error("Setup failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Welchen Rang hast du aktuell?
              </h2>
              <p className="text-gray-500 mt-2">Wähle deinen aktuellen Zinzino Rang</p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {ZINZINO_RANKS.map((rank) => (
                <button
                  key={rank.id}
                  onClick={() => setData({ ...data, current_rank: rank.id })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    data.current_rank === rank.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{rank.icon}</span>
                  <p className="font-medium mt-1 text-gray-900 dark:text-white">
                    {rank.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Wie groß ist dein Team?
              </h2>
              <p className="text-gray-500 mt-2">
                Gesamtzahl deiner direkten & indirekten Partner
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anzahl Partner im Team
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.team_size || ""}
                  onChange={(e) =>
                    setData({ ...data, team_size: parseInt(e.target.value) || 0 })
                  }
                  placeholder="z.B. 12"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Persönliche Kundenpunkte (PCP)
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.pcp || ""}
                  onChange={(e) =>
                    setData({ ...data, pcp: parseInt(e.target.value) || 0 })
                  }
                  placeholder="z.B. 8"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Persönliche Credits
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.personal_credits || ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      personal_credits: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="z.B. 45"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-lg"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Deine Team Balance
              </h2>
              <p className="text-gray-500 mt-2">Credits in deinem linken und rechten Bein</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Linkes Bein (Credits)
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.left_leg_credits || ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      left_leg_credits: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="z.B. 380"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rechtes Bein (Credits)
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.right_leg_credits || ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      right_leg_credits: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="z.B. 240"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-lg"
                />
              </div>
            </div>

            {(data.left_leg_credits > 0 || data.right_leg_credits > 0) && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">Balanced Credits:</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.min(data.left_leg_credits, data.right_leg_credits) * 2}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Ratio:{" "}
                  {data.left_leg_credits > 0 && data.right_leg_credits > 0
                    ? `${(
                        Math.max(data.left_leg_credits, data.right_leg_credits) /
                        Math.min(data.left_leg_credits, data.right_leg_credits)
                      ).toFixed(1)}:1`
                    : "-"}
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Z4F Status</h2>
              <p className="text-gray-500 mt-2">
                Zinzino For Free - Wie viele Premier Kunden hast du?
              </p>
            </div>

            <div className="flex justify-center gap-4">
              {[0, 1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setData({ ...data, z4f_customers: num })}
                  className={`w-14 h-14 rounded-xl text-xl font-bold transition-all ${
                    data.z4f_customers === num
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {data.z4f_customers >= 4 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                <p className="text-green-700 dark:text-green-300 font-medium">
                  🎉 Du bist Z4F qualifiziert!
                </p>
              </div>
            )}

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mt-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Zusammenfassung</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Rang:</span>
                  <span className="font-medium">
                    {ZINZINO_RANKS[data.current_rank]?.icon}{" "}
                    {ZINZINO_RANKS[data.current_rank]?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Team:</span>
                  <span className="font-medium">{data.team_size} Partner</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Balance:</span>
                  <span className="font-medium">
                    {data.left_leg_credits} / {data.right_leg_credits}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Z4F:</span>
                  <span className="font-medium">{data.z4f_customers}/4 Kunden</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-8">
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full transition-colors ${
                i < step ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        {renderStep()}

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              step === 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Zurück
          </button>

          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Weiter
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Speichern..." : "Fertig"}
              <Check className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-center mt-6">
          <button onClick={onComplete} className="text-sm text-gray-400 hover:text-gray-600">
            Später einrichten →
          </button>
        </p>
      </div>
    </div>
  );
}

