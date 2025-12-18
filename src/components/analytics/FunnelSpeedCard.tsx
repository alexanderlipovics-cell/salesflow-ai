import { Card } from "../ui/Card";
import type { CompanyFunnelSpeed } from "@/types/analytics";

type Props = {
  data: CompanyFunnelSpeed[];
};

export function FunnelSpeedCard({ data }: Props) {
  return (
    <Card
      title="Funnel-Speed pro Firma"
      subtitle="Tage von Erstkontakt → Partner"
    >
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Noch keine Daten vorhanden.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-left text-[11px] text-slate-400">
                <th className="py-2 pr-4">Firma</th>
                <th className="py-2 pr-4 text-right">Ø Tage</th>
                <th className="py-2 pr-4 text-right">Min</th>
                <th className="py-2 text-right">Max</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.company_name} className="border-b border-slate-700 last:border-b-0">
                  <td className="py-2 pr-4 text-[12px] font-medium text-slate-200">
                    {c.company_name}
                  </td>
                  <td className="py-2 pr-4 text-right text-[13px] font-semibold text-blue-700">
                    {c.avg_days_to_partner.toFixed(1)}
                  </td>
                  <td className="py-2 pr-4 text-right text-[11px] text-slate-500">
                    {c.min_days_to_partner.toFixed(1)}
                  </td>
                  <td className="py-2 text-right text-[11px] text-gray-500">
                    {c.max_days_to_partner.toFixed(1)}
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

