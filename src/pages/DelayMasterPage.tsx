import { DelayMasterPanel } from "../features/delay-master/DelayMasterPanel";

export default function DelayMasterPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-semibold">Delay-Master · Verspätungen & kurze Zeitfenster</h1>
      <p className="text-sm text-slate-400">
        Erzeuge in wenigen Sekunden perfekte Nachrichten für Verspätungen oder kurze Zeitfenster im
        Außendienst.
      </p>

      <DelayMasterPanel />
    </div>
  );
}


