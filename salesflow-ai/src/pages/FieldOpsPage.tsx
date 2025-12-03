import React, { useEffect, useContext } from "react";
import { DelayMasterPanel } from "../features/field-ops/DelayMasterPanel";
import { MapPin, Coffee, Zap, History } from "lucide-react";
import { useReactivation } from "@/hooks/useReactivation";
import { ReactivationCard } from "@/components/fieldops/ReactivationCard";
import { UserContext } from "@/context/UserContext";

export const FieldOpsPage: React.FC = () => {
  const { workspaceId, userId } = useContext(UserContext) || {};
  const reactivation = useReactivation(workspaceId || '', userId || '');

  useEffect(() => {
    if (workspaceId && userId) {
      reactivation.fetchCandidates({
        minDaysSinceContact: 21,
        maxDaysSinceContact: 180,
        limit: 6,
      });
    }
  }, [workspaceId, userId]);

  const handleReactivate = (contactId: string) => {
    console.log('Reactivating contact:', contactId);
    // TODO: Navigate to contact detail or open reactivation dialog
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      {/* Header Area */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Außendienst Cockpit</h1>
        <p className="text-slate-400">
          Dein Co-Pilot für unterwegs. Nutze Leerlauf oder rette Verspätungen.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: PHOENIX (Too Early) - Placeholder UI */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="w-24 h-24 text-amber-500" />
            </div>

            <div className="flex items-center gap-2 mb-6 text-amber-400">
              <Coffee className="w-6 h-6" />
              <h2 className="text-xl font-bold text-white">Phönix: Zu früh?</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-amber-500/50 transition cursor-pointer group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-amber-400 transition">
                      30 Min · Leads in der Nähe
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      3 Networker im Umkreis von 2km gefunden.
                    </p>
                  </div>
                  <MapPin className="w-5 h-5 text-slate-500 group-hover:text-amber-400" />
                </div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-amber-500/50 transition cursor-pointer group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-amber-400 transition">
                      DM-Session im Café
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Nächstes Starbucks: 400m. 5 DMs vorbereitet.
                    </p>
                  </div>
                  <Coffee className="w-5 h-5 text-slate-500 group-hover:text-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DELAY MASTER (Too Late) - Echte Komponente */}
        <div>
          {/* Hier binden wir deine Komponente ein */}
          <DelayMasterPanel className="h-full" />
        </div>
      </div>

      {/* Reactivation Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-amber-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Reaktivieren statt scrollen</h2>
            <p className="text-sm text-slate-400">
              Warme Leads die kalt geworden sind – mit smartem Reactivation Score
            </p>
          </div>
        </div>

        {reactivation.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-xl bg-slate-800/50 border border-slate-700 animate-pulse"
              />
            ))}
          </div>
        ) : reactivation.error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
            Fehler beim Laden der Reaktivierungs-Kandidaten
          </div>
        ) : reactivation.candidates.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
            <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">
              Keine Reaktivierungs-Kandidaten gefunden. Alle Leads sind aktiv!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reactivation.candidates.map((candidate) => (
              <ReactivationCard
                key={candidate.contact_id}
                candidate={candidate}
                onReactivate={handleReactivate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldOpsPage;
