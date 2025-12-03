import { Card } from "../ui/Card";
import type { SegmentPartnerPerformance } from "@/types/analytics";

type Props = {
  data: SegmentPartnerPerformance[];
};

export function SegmentPerformanceCard({ data }: Props) {
  return (
    <Card
      title="Segment-Performance"
      subtitle="Lead → Partner Conversion"
    >
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Noch keine Daten vorhanden.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-left text-[11px] text-slate-400">
                <th className="py-2 pr-4">Segment</th>
                <th className="py-2 pr-4 text-right">Leads</th>
                <th className="py-2 pr-4 text-right">Partner</th>
                <th className="py-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.segment_id} className="border-b border-slate-700 last:border-b-0">
                  <td className="py-2 pr-4 text-[12px] font-medium text-slate-200">
                    {s.segment_name}
                  </td>
                  <td className="py-2 pr-4 text-right text-[11px] text-slate-500">
                    {s.leads_in_segment}
                  </td>
                  <td className="py-2 pr-4 text-right text-[11px] text-slate-500">
                    {s.partner_conversions}
                  </td>
                  <td className="py-2 text-right text-[13px] font-semibold text-emerald-400">
                    {s.partner_conversion_rate_pct.toFixed(1)}%
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

