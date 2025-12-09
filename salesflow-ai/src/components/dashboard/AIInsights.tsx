import { Loader2, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import { InsightItem } from "../../hooks/useDashboardData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface Props {
  insights?: InsightItem[];
  isLoading?: boolean;
}

export const AIInsights: React.FC<Props> = ({ insights, isLoading: loadingProp }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<InsightItem[]>([]);

  useEffect(() => {
    if (insights) {
      setData(insights);
      return;
    }
    const fetchInsights = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/api/ai/insights`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (res.ok) {
          const json = await res.json();
          const arr = Array.isArray(json.insights) ? json.insights : [];
          setData(
            arr.map((i: any, idx: number) => ({
              title: i.title ?? `Insight ${idx + 1}`,
              description: i.description ?? i.text ?? "",
            }))
          );
        } else {
          setData([]);
        }
      } catch {
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInsights();
  }, [insights]);

  const loading = loadingProp ?? isLoading;
  const rendered = insights ?? data;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!rendered.length) {
    return <p className="text-sm text-gray-400">Keine AI Insights verfügbar.</p>;
  }

  return (
    <div className="space-y-4">
      {rendered.map((insight, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 p-4 shadow-[0_0_30px_rgba(34,211,238,0.1)]"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-cyan-500/20 p-2 text-cyan-200">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{insight.title}</div>
              <p className="text-sm text-gray-300">{insight.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AIInsights;

