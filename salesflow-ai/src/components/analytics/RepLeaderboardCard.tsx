import { Card } from "../ui/Card";
import type { RepLeaderboardEntry } from "@/types/analytics";

type Props = {
  data: RepLeaderboardEntry[];
};

export function RepLeaderboardCard({ data }: Props) {
  return (
    <Card title="Rep-Leaderboard" subtitle="Streak + Conversion Rate">
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Noch keine Daten vorhanden.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-left text-[11px] text-slate-400">
                <th className="py-2 pr-4">Rep</th>
                <th className="py-2 pr-4 text-right">Streak</th>
                <th className="py-2 pr-4 text-right">Contacts</th>
                <th className="py-2 pr-4 text-right">Conv</th>
                <th className="py-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, idx) => (
                <tr key={r.user_id} className="border-b border-slate-700 last:border-b-0">
                  <td className="py-2 pr-4 text-[12px] font-medium text-slate-200">
                    {idx + 1}. {r.name}
                  </td>
                  <td className="py-2 pr-4 text-right text-[12px] font-semibold text-orange-400">
                    {r.current_streak} 🔥
                  </td>
                  <td className="py-2 pr-4 text-right text-[11px] text-slate-500">
                    {r.contacts_30d}
                  </td>
                  <td className="py-2 pr-4 text-right text-[11px] text-slate-500">
                    {r.conversions_30d}
                  </td>
                  <td className="py-2 text-right text-[13px] font-semibold text-emerald-400">
                    {r.conversion_rate_30d_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

