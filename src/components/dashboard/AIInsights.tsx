import { Loader2, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import { InsightItem } from "../../hooks/useDashboardData";

interface Props {
  insights?: InsightItem[];
  isLoading?: boolean;
  onInsightClick?: (insight: InsightItem) => void;
}

export const AIInsights: React.FC<Props> = ({ insights, isLoading: loadingProp, onInsightClick }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<InsightItem[]>([]);

  useEffect(() => {
    if (insights) {
      setData(insights);
      return;
    }
    // Endpoint nicht verfügbar → keine Fetches, leere Liste
    setData([]);
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
          onClick={() => onInsightClick?.(insight)}
          className={`rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 p-4 shadow-[0_0_30px_rgba(34,211,238,0.1)] ${
            onInsightClick || insight?.action
              ? "cursor-pointer hover:border-cyan-400/60 hover:bg-cyan-500/15 transition"
              : ""
          }`}
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

