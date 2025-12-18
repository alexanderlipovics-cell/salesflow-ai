/**
 * AdvancedDashboard Component
 * Displays advanced analytics data from analytics_dashboard.py endpoint
 */
import { Card } from "../ui/Card";
import type { AdvancedAnalyticsData, DateRange } from "@/hooks/useAnalyticsDashboard";

type Props = {
  data: AdvancedAnalyticsData;
  dateRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  onExport: () => void;
};

export function AdvancedDashboard({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Revenue Timeline */}
      <Card title="Revenue Timeline" subtitle="Umsatz & Signups über Zeit">
        {data.revenue_timeline.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Daten vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-left text-[11px] text-slate-400">
                  <th className="py-2 pr-4">Datum</th>
                  <th className="py-2 pr-4 text-right">Revenue</th>
                  <th className="py-2 text-right">Signups</th>
                </tr>
              </thead>
              <tbody>
                {data.revenue_timeline.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-700 last:border-b-0">
                    <td className="py-2 pr-4 text-[12px] text-slate-300">
                      {new Date(item.date).toLocaleDateString("de-DE")}
                    </td>
                    <td className="py-2 pr-4 text-right text-[13px] font-semibold text-emerald-400">
                      {item.revenue.toFixed(2)} €
                    </td>
                    <td className="py-2 text-right text-[13px] font-semibold text-blue-400">
                      {item.signups}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Top Products */}
      <Card title="Top Produkte" subtitle="Bestseller nach Umsatz">
        {data.top_products.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Daten vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-left text-[11px] text-slate-400">
                  <th className="py-2 pr-4">Produkt</th>
                  <th className="py-2 pr-4 text-right">Revenue</th>
                  <th className="py-2 text-right">Einheiten</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.map((product) => (
                  <tr key={product.product_id} className="border-b border-slate-700 last:border-b-0">
                    <td className="py-2 pr-4 text-[12px] font-medium text-slate-200">
                      {product.product_name}
                    </td>
                    <td className="py-2 pr-4 text-right text-[13px] font-semibold text-emerald-400">
                      {product.revenue.toFixed(2)} €
                    </td>
                    <td className="py-2 text-right text-[13px] text-slate-400">
                      {product.units}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* User Growth */}
      <Card title="User Growth" subtitle="Wachstum & Churn">
        {data.user_growth.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Daten vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-left text-[11px] text-slate-400">
                  <th className="py-2 pr-4">Datum</th>
                  <th className="py-2 pr-4 text-right">Neue User</th>
                  <th className="py-2 pr-4 text-right">Churned</th>
                  <th className="py-2 text-right">Netto</th>
                </tr>
              </thead>
              <tbody>
                {data.user_growth.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-700 last:border-b-0">
                    <td className="py-2 pr-4 text-[12px] text-slate-300">
                      {new Date(item.date).toLocaleDateString("de-DE")}
                    </td>
                    <td className="py-2 pr-4 text-right text-[13px] text-emerald-400">
                      +{item.new_users}
                    </td>
                    <td className="py-2 pr-4 text-right text-[13px] text-red-400">
                      -{item.churned_users}
                    </td>
                    <td className="py-2 text-right text-[13px] font-semibold text-slate-200">
                      {item.net_growth > 0 ? "+" : ""}{item.net_growth}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Feature Adoption */}
      <Card title="Feature Adoption" subtitle="Nutzung pro Feature">
        {data.feature_adoption.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Daten vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-left text-[11px] text-slate-400">
                  <th className="py-2 pr-4">Feature</th>
                  <th className="py-2 pr-4 text-right">Aktive User</th>
                  <th className="py-2 text-right">Adoption Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.feature_adoption.map((feature, idx) => (
                  <tr key={idx} className="border-b border-slate-700 last:border-b-0">
                    <td className="py-2 pr-4 text-[12px] font-medium text-slate-200">
                      {feature.feature_name}
                    </td>
                    <td className="py-2 pr-4 text-right text-[13px] text-slate-400">
                      {feature.active_users}
                    </td>
                    <td className="py-2 text-right text-[13px] font-semibold text-blue-400">
                      {feature.adoption_rate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Geo Distribution */}
      <Card title="Geografische Verteilung" subtitle="User & Revenue nach Land">
        {data.geo_distribution.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Daten vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-left text-[11px] text-slate-400">
                  <th className="py-2 pr-4">Land</th>
                  <th className="py-2 pr-4 text-right">Users</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.geo_distribution.map((geo) => (
                  <tr key={geo.country} className="border-b border-slate-700 last:border-b-0">
                    <td className="py-2 pr-4 text-[12px] font-medium text-slate-200">
                      {geo.country}
                    </td>
                    <td className="py-2 pr-4 text-right text-[13px] text-slate-400">
                      {geo.users}
                    </td>
                    <td className="py-2 text-right text-[13px] font-semibold text-emerald-400">
                      {geo.revenue.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Cohort Retention */}
      <Card title="Cohort Retention" subtitle="Retention nach Monaten">
        {data.cohort_retention.length === 0 ? (
          <p className="text-sm text-slate-400">Noch keine Daten vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-left text-[11px] text-slate-400">
                  <th className="py-2 pr-4">Cohort</th>
                  <th className="py-2 pr-4 text-right">M0</th>
                  <th className="py-2 pr-4 text-right">M1</th>
                  <th className="py-2 pr-4 text-right">M3</th>
                  <th className="py-2 text-right">M6</th>
                </tr>
              </thead>
              <tbody>
                {data.cohort_retention.map((cohort) => (
                  <tr key={cohort.cohort} className="border-b border-slate-700 last:border-b-0">
                    <td className="py-2 pr-4 text-[12px] font-medium text-slate-200">
                      {cohort.cohort}
                    </td>
                    <td className="py-2 pr-4 text-right text-[13px] text-slate-400">
                      {cohort.month_0}%
                    </td>
                    <td className="py-2 pr-4 text-right text-[13px] text-slate-400">
                      {cohort.month_1}%
                    </td>
                    <td className="py-2 pr-4 text-right text-[13px] text-slate-400">
                      {cohort.month_3}%
                    </td>
                    <td className="py-2 text-right text-[13px] font-semibold text-blue-400">
                      {cohort.month_6}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
