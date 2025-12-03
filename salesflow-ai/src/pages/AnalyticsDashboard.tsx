/**
 * Analytics Dashboard Page
 * Dark Theme kompatibel mit AppShell
 */
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAnalyticsDashboard } from "@/hooks/useAnalyticsDashboard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { TopTemplatesCard } from "@/components/analytics/TopTemplatesCard";
import { FunnelSpeedCard } from "@/components/analytics/FunnelSpeedCard";
import { SegmentPerformanceCard } from "@/components/analytics/SegmentPerformanceCard";
import { RepLeaderboardCard } from "@/components/analytics/RepLeaderboardCard";
import { AdvancedDashboard } from "@/components/analytics/AdvancedDashboard";
import { useState } from "react";

export function AnalyticsDashboard() {
  const [workspaceId, setWorkspaceId] = useState("demo-workspace");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
  const { data: legacyData, loadState, error, refetch } = useAnalytics(30);
  const {
    data: advancedData,
    loading: advancedLoading,
    error: advancedError,
    refetch: refetchAdvanced,
    autoRefresh,
    setAutoRefresh,
  } = useAnalyticsDashboard({
    workspaceId,
    range: dateRange,
  });

  const handleExport = () => {
    if (!advancedData) return;
    const rows = [
      ["Date", "Revenue", "Signups"],
      ...advancedData.revenue_timeline.map((row) => [
        row.date,
        row.revenue,
        row.signups,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Workspace ID
            <input
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="mt-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  dateRange === range
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-Refresh
          </label>
          <button
            onClick={handleExport}
            disabled={!advancedData}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            CSV Export
          </button>
          <button
            onClick={refetchAdvanced}
            disabled={advancedLoading}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50"
          >
            {advancedLoading ? "Sync..." : "Advanced Refresh"}
          </button>
        </div>
        {advancedLoading && !advancedData && (
          <div className="flex h-48 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        )}
        {advancedError && (
          <ErrorAlert message={advancedError} onRetry={refetchAdvanced} />
        )}
        {advancedData && !advancedError && (
          <AdvancedDashboard
            data={advancedData}
            dateRange={dateRange}
            onRangeChange={setDateRange}
            onExport={handleExport}
          />
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">
              Legacy Insights
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Templates, Funnel & Team-Performance – alles auf einen Blick.
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={loadState === "loading"}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {loadState === "loading" ? (
              <LoadingSpinner size="sm" />
            ) : (
              "Aktualisieren"
            )}
          </button>
        </div>

        {loadState === "loading" && (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-slate-400">
                Analytics werden geladen...
              </p>
            </div>
          </div>
        )}

        {loadState === "error" && error && (
          <ErrorAlert message={error} onRetry={refetch} />
        )}

        {loadState === "success" && legacyData && (
          <div className="grid gap-6 lg:grid-cols-2">
            <TopTemplatesCard data={legacyData.topTemplates} />
            <FunnelSpeedCard data={legacyData.funnelSpeed} />
            <SegmentPerformanceCard data={legacyData.segmentPerformance} />
            <RepLeaderboardCard data={legacyData.repLeaderboard} />
          </div>
        )}

        {loadState === "success" && (
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Auto-Refresh alle 30 Sekunden • Letzte Aktualisierung:{" "}
              {new Date().toLocaleTimeString("de-DE")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
