/**
 * Beispiel: Button mit Vertical-basierter Terminologie
 * 
 * Zeigt, wie man t(key) nutzt, um branchenspezifische Begriffe zu verwenden.
 */

import { useVertical } from "@/context/VerticalContext";
import { Button } from "@/components/ui/button";

export function DealButtonExample({ onClick }: { onClick: () => void }) {
  const { t } = useVertical();

  return (
    <Button onClick={onClick} variant="primary">
      {/* 
        MLM: "Einschreiben erstellen"
        Real Estate: "Abschluss erstellen"
        Default: "Deal erstellen"
      */}
      {t("deal")} erstellen
    </Button>
  );
}

export function RevenueDisplayExample({ amount }: { amount: number }) {
  const { t } = useVertical();

  return (
    <div>
      <h3>{t("revenue")}</h3>
      <p className="text-2xl font-bold">
        {new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "EUR",
        }).format(amount)}
      </p>
      <p className="text-sm text-gray-500">
        Gesamter {t("revenue").toLowerCase()} dieses Monats
      </p>
    </div>
  );
}

export function CustomerLabelExample() {
  const { t } = useVertical();

  return (
    <div>
      <h2>{t("customer")} Übersicht</h2>
      {/* 
        MLM: "Partner Übersicht"
        Real Estate: "Kunde Übersicht"
        Default: "Customer Übersicht"
      */}
    </div>
  );
}

