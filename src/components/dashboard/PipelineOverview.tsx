import { ArrowRight, Loader2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PipelineStage } from "../../hooks/useDashboardData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface Props {
  stages?: PipelineStage[];
  isLoading?: boolean;
}

export const PipelineOverview: React.FC<Props> = ({ stages, isLoading: loadingProp }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<PipelineStage[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (stages) {
      setData(stages);
      return;
    }
    const fetchPipeline = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/api/leads?group_by=status`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (res.ok) {
          const json = await res.json();
          const groups = Array.isArray(json.groups) ? json.groups : [];
          setData(
            groups.map((g: any) => ({
              status: g.status ?? g.stage ?? "Unbekannt",
              count: g.count ?? g.total ?? 0,
              value: g.value ?? g.total_value,
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
    fetchPipeline();
  }, [stages]);

  const rendered = useMemo(() => stages ?? data, [stages, data]);
  const loading = loadingProp ?? isLoading;
  const maxCount = Math.max(...rendered.map((s) => s.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!rendered.length) {
    return <p className="text-sm text-gray-400">Keine Pipeline-Daten verfügbar.</p>;
  }

  return (
    <div className="space-y-3">
      {rendered.map((stage) => {
        const width = `${Math.max((stage.count / maxCount) * 100, 6)}%`;
        return (
          <button
            key={stage.status}
            type="button"
            onClick={() => navigate(`/leads?status=${encodeURIComponent(stage.status)}`)}
            className="w-full rounded-xl border border-white/5 bg-white/5 p-3 text-left transition hover:border-cyan-400/40 hover:bg-white/10"
          >
            <div className="flex items-center justify-between text-sm text-white">
              <span className="font-semibold">{stage.status}</span>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span>{stage.count} Leads</span>
                {typeof stage.value === "number" && (
                  <span className="text-cyan-300">
                    {Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(stage.value)}
                  </span>
                )}
                <ArrowRight className="h-4 w-4 text-cyan-300" />
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                style={{ width }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default PipelineOverview;

