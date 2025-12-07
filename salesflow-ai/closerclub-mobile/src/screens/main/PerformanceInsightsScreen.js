// src/screens/main/PerformanceInsightsScreen.js

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Share,
} from "react-native";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { LineChart } from "react-native-chart-kit";
import * as Haptics from "expo-haptics";
import { mobileApi } from "../../services/api";

const screenWidth = Dimensions.get("window").width;

// Erwartete Struktur vom Backend (Beispiel):
// PerformanceInsight {
//   id,
//   period_start,
//   period_end,
//   kpis: {
//     revenue,
//     calls,
//     deals,
//     conversion_rate,
//     revenue_trend,
//     calls_trend,
//     deals_trend,
//     conversion_trend
//   },
//   time_series: {
//     labels: string[],
//     calls: number[],
//     deals: number[]
//   },
//   issues: [{ id, title, severity, description }],
//   recommendations: [{ id, title, description, priority }]
// }

function getPeriodRange(periodKey) {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  if (periodKey === "month") {
    start.setMonth(start.getMonth() - 1);
  } else if (periodKey === "quarter") {
    start.setMonth(start.getMonth() - 3);
  } else if (periodKey === "year") {
    start.setFullYear(start.getFullYear() - 1);
  }

  return {
    start,
    end,
  };
}

export default function PerformanceInsightsScreen() {
  const [period, setPeriod] = useState("month"); // 'month' | 'quarter' | 'year'
  const [insight, setInsight] = useState(null);
  const [history, setHistory] = useState([]); // optional: my-insights

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // --- Toast Auto-Hide ---
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // --- Insights laden ---
  const fetchInsight = async (periodKey, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      const { start, end } = getPeriodRange(periodKey);
      const periodStart = start.toISOString().split('T')[0]; // YYYY-MM-DD
      const periodEnd = end.toISOString().split('T')[0]; // YYYY-MM-DD

      const data = await mobileApi.getPerformanceInsights({
        period_start: periodStart,
        period_end: periodEnd,
      });

      // Transform API response to expected format
      setInsight({
        kpis: {
          revenue: data.metrics.revenue,
          calls: data.metrics.calls,
          deals: data.metrics.deals,
          conversion_rate: data.metrics.conversion_rate,
          revenue_trend: data.trends.revenue,
          calls_trend: data.trends.calls,
          deals_trend: data.trends.deals,
          conversion_trend: data.trends.conversion_rate,
        },
        time_series: {
          labels: [], // TODO: Wenn Backend Zeitreihen liefert
          calls: [],
          deals: [],
        },
        issues: data.issues.map((issue, idx) => ({
          id: `issue-${idx}`,
          title: issue.issue,
          severity: issue.severity,
          description: issue.impact,
        })),
        recommendations: data.recommendations.map((rec, idx) => ({
          id: `rec-${idx}`,
          title: rec.title,
          description: rec.description,
          priority: 'high', // Fallback
          action_items: rec.action_items,
        })),
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Analyse konnte nicht geladen werden. Bitte später erneut versuchen."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Optional: History laden (noch nicht im API Service)
  const fetchHistory = async () => {
    try {
      // TODO: Wenn Backend History-Endpoint hat
      setHistory([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Initial laden
  useEffect(() => {
    fetchInsight(period, false);
    fetchHistory();
  }, []);

  // Wenn Zeitraum geändert wird
  useEffect(() => {
    fetchInsight(period, false);
  }, [period]);

  const onRefresh = () => {
    fetchInsight(period, true);
  };

  // --- KPI Data ---
  const kpis = insight?.kpis || {};
  const kpiCards = useMemo(
    () => [
      {
        key: "revenue",
        label: "Umsatz",
        value: kpis.revenue ?? 0,
        suffix: "€",
        trend: kpis.revenue_trend ?? 0,
      },
      {
        key: "calls",
        label: "Calls",
        value: kpis.calls ?? 0,
        suffix: "",
        trend: kpis.calls_trend ?? 0,
      },
      {
        key: "deals",
        label: "Deals",
        value: kpis.deals ?? 0,
        suffix: "",
        trend: kpis.deals_trend ?? 0,
      },
      {
        key: "conversion",
        label: "Conversion",
        value: (kpis.conversion_rate ?? 0) * 100,
        suffix: "%",
        trend: kpis.conversion_trend ?? 0,
      },
    ],
    [kpis]
  );

  const chartData = useMemo(() => {
    const ts = insight?.time_series || {};
    const labels = ts.labels || [];
    const calls = ts.calls || [];
    const deals = ts.deals || [];

    if (!labels.length || !calls.length || !deals.length) return null;

    return {
      labels,
      datasets: [
        {
          data: calls,
          color: (opacity = 1) => `rgba(252, 165, 165, ${opacity})`, // rot-ish
          strokeWidth: 2,
        },
        {
          data: deals,
          color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`, // grün-ish
          strokeWidth: 2,
        },
      ],
      legend: ["Calls", "Deals"],
    };
  }, [insight]);

  const issues = insight?.issues || [];
  const recommendations = insight?.recommendations || [];

  const periodIndex =
    period === "month" ? 0 : period === "quarter" ? 1 : 2;

  const periodLabel =
    period === "month"
      ? "Monat"
      : period === "quarter"
      ? "Quartal"
      : "Jahr";

  const handleShare = async () => {
    if (!insight) return;
    try {
      const text =
        `Performance Insights (${periodLabel}):\n\n` +
        `Umsatz: ${kpis.revenue ?? 0} €\n` +
        `Calls: ${kpis.calls ?? 0}\n` +
        `Deals: ${kpis.deals ?? 0}\n` +
        `Conversion: ${((kpis.conversion_rate ?? 0) * 100).toFixed(
          1
        )}%\n\n` +
        `Top Empfehlung: ${
          recommendations[0]?.title || "Keine Empfehlung vorhanden."
        }`;

      await Share.share({
        message: text,
      });
    } catch (err) {
      console.error(err);
      setToast("Report konnte nicht geteilt werden.");
    }
  };

  if (!accessToken) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centered}
      >
        <Text style={styles.infoText}>
          Du bist nicht eingeloggt. Bitte melde dich an, um Performance
          Insights zu sehen.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#a3e635"
        />
      }
    >
      {/* Toast */}
      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Performance Insights</Text>
          <Text style={styles.subtitle}>
            Analysiere deine Umsatz- und Aktivitäts-Performance.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          disabled={!insight}
        >
          <Text style={styles.shareButtonText}>Teilen</Text>
        </TouchableOpacity>
      </View>

      {/* Period Control */}
      <View style={styles.periodContainer}>
        <SegmentedControl
          values={["Monat", "Quartal", "Jahr"]}
          selectedIndex={periodIndex}
          onChange={(event) => {
            const idx = event.nativeEvent.selectedSegmentIndex;
            const keys = ["month", "quarter", "year"];
            const nextPeriod = keys[idx] || "month";
            setPeriod(nextPeriod);
          }}
          tintColor="#22c55e"
          fontStyle={{ color: "#9ca3af", fontSize: 12 }}
          activeFontStyle={{ color: "#0b1120", fontWeight: "600" }}
          style={styles.segmented}
        />
      </View>

      {loading && !insight ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#a3e635" />
          <Text style={styles.loadingText}>Lade Insights…</Text>
        </View>
      ) : null}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* KPI Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kpiScroll}
      >
        {kpiCards.map((card) => {
          const trend = card.trend ?? 0;
          const isUp = trend >= 0;
          return (
            <View key={card.key} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{card.label}</Text>
              <Text style={styles.kpiValue}>
                {card.value.toLocaleString("de-DE", {
                  maximumFractionDigits:
                    card.key === "conversion" ? 1 : 0,
                })}
                {card.suffix}
              </Text>
              <View style={styles.kpiTrendRow}>
                <Text
                  style={[
                    styles.kpiTrendValue,
                    isUp ? styles.kpiTrendUp : styles.kpiTrendDown,
                  ]}
                >
                  {isUp ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
                </Text>
                <Text style={styles.kpiTrendLabel}>vs. vorherige Periode</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Calls & Deals</Text>
            <Text style={styles.chartSubtitle}>
              Entwicklung über den gewählten Zeitraum
            </Text>
          </View>
        </View>
        {chartData ? (
          <LineChart
            data={chartData}
            width={screenWidth - 32}
            height={220}
            withShadow={false}
            withDots
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            chartConfig={{
              backgroundColor: "#020617",
              backgroundGradientFrom: "#020617",
              backgroundGradientTo: "#020617",
              decimalPlaces: 0,
              color: (opacity = 1) =>
                `rgba(148, 163, 184, ${opacity})`,
              labelColor: (opacity = 1) =>
                `rgba(148, 163, 184, ${opacity})`,
              propsForDots: {
                r: "3",
              },
            }}
            bezier
            style={styles.chart}
          />
        ) : (
          <Text style={styles.chartPlaceholder}>
            Noch keine Zeitreihen-Daten verfügbar.
          </Text>
        )}
      </View>

      {/* Issues */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Issue Detection</Text>
        {issues.length === 0 ? (
          <Text style={styles.sectionEmptyText}>
            Aktuell keine erkannten Probleme – weiter so! 🚀
          </Text>
        ) : (
          issues.map((issue) => {
            const sev = issue.severity || "medium";
            const sevStyle =
              sev === "high"
                ? styles.issueHigh
                : sev === "low"
                ? styles.issueLow
                : styles.issueMedium;
            return (
              <View
                key={issue.id}
                style={[styles.issueCard, sevStyle]}
              >
                <View style={styles.issueHeaderRow}>
                  <Text style={styles.issueTitle}>{issue.title}</Text>
                  <Text style={styles.issueSeverity}>
                    {sev.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.issueDescription}>
                  {issue.description}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* Recommendations */}
      <View style={[styles.sectionCard, { marginBottom: 24 }]}>
        <Text style={styles.sectionTitle}>AI-Empfehlungen</Text>
        {recommendations.length === 0 ? (
          <Text style={styles.sectionEmptyText}>
            Noch keine spezifischen Empfehlungen. Sammle mehr Daten,
            um Insights zu generieren.
          </Text>
        ) : (
          recommendations.map((rec) => {
            const priority = rec.priority || "medium";
            return (
              <View key={rec.id} style={styles.recommendationCard}>
                <View style={styles.recommendationHeaderRow}>
                  <Text style={styles.recommendationTitle}>
                    {rec.title}
                  </Text>
                  <Text
                    style={[
                      styles.priorityBadge,
                      priority === "high"
                        ? styles.priorityHigh
                        : priority === "low"
                        ? styles.priorityLow
                        : styles.priorityMedium,
                    ]}
                  >
                    {priority.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.recommendationDescription}>
                  {rec.description}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617", // slate-950
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 24,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  infoText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  subtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  shareButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#22c55e",
    backgroundColor: "#022c22",
  },
  shareButtonText: {
    fontSize: 11,
    color: "#bbf7d0",
    fontWeight: "600",
  },
  periodContainer: {
    marginBottom: 12,
  },
  segmented: {
    backgroundColor: "#020617",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#9ca3af",
    marginLeft: 8,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "#ef4444",
    backgroundColor: "#7f1d1d",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#fee2e2",
  },
  kpiScroll: {
    paddingVertical: 8,
  },
  kpiCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    padding: 10,
  },
  kpiLabel: {
    fontSize: 11,
    color: "#9ca3af",
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e5e7eb",
    marginTop: 4,
  },
  kpiTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  kpiTrendValue: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 6,
  },
  kpiTrendUp: {
    color: "#22c55e",
  },
  kpiTrendDown: {
    color: "#f97316",
  },
  kpiTrendLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    padding: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  chartSubtitle: {
    fontSize: 11,
    color: "#9ca3af",
  },
  chart: {
    marginTop: 4,
    borderRadius: 12,
  },
  chartPlaceholder: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 12,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    padding: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 6,
  },
  sectionEmptyText: {
    fontSize: 12,
    color: "#6b7280",
  },
  issueCard: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  issueHigh: {
    backgroundColor: "#7f1d1d",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  issueMedium: {
    backgroundColor: "#78350f",
    borderWidth: 1,
    borderColor: "#f97316",
  },
  issueLow: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  issueHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  issueTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f9fafb",
  },
  issueSeverity: {
    fontSize: 10,
    color: "#e5e7eb",
  },
  issueDescription: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  recommendationCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    padding: 8,
    marginBottom: 6,
  },
  recommendationHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  recommendationTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f9fafb",
  },
  recommendationDescription: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  priorityBadge: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priorityHigh: {
    backgroundColor: "#7f1d1d",
    color: "#fee2e2",
  },
  priorityMedium: {
    backgroundColor: "#78350f",
    color: "#ffedd5",
  },
  priorityLow: {
    backgroundColor: "#0f172a",
    color: "#cbd5f5",
  },
  toast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 28,
    alignSelf: "center",
    backgroundColor: "#064e3b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 20,
  },
  toastText: {
    fontSize: 11,
    color: "#bbf7d0",
  },
});

