import { Card } from "../ui/Card";
import type { TemplatePartnerStat } from "@/types/analytics";

type Props = {
  data: TemplatePartnerStat[];
};

export function TopTemplatesCard({ data }: Props) {
  return (
    <Card title="Top Templates" subtitle="Partner-Conversions (30 Tage)">
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Noch keine Daten vorhanden.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-left text-[11px] text-slate-400">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Template</th>
                <th className="py-2 text-right">Partner</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t, idx) => (
                <tr key={t.template_id} className="border-b border-slate-700 last:border-b-0">
                  <td className="py-2 pr-4 text-[11px] text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2 pr-4 text-[12px] font-medium text-slate-200">
                    {t.template_name}
                  </td>
                  <td className="py-2 text-right text-[13px] font-semibold text-emerald-400">
                    {t.partner_conversions_30d}
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

