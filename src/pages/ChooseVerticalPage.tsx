import { useNavigate } from "react-router-dom";
import { useVertical, type Vertical } from "../core/VerticalContext";

export default function ChooseVerticalPage() {
  const { setVertical } = useVertical();
  const navigate = useNavigate();

  function selectVertical(v: Vertical) {
    setVertical(v);
    navigate("/onboarding");
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">Deine Branche wählen</h1>
      <p className="text-sm text-slate-400">
        Wähle, in welchem Bereich du Sales Flow AI hauptsächlich nutzt. Du
        kannst das später in den Einstellungen ändern.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          onClick={() => selectVertical("network_marketing")}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-emerald-500"
        >
          <div className="font-semibold">Network-Marketing</div>
          <div className="text-xs text-slate-400">
            Team-Aufbau, DMs, Follow-ups, Events.
          </div>
        </button>

        <button
          onClick={() => selectVertical("immo")}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-emerald-500"
        >
          <div className="font-semibold">Immobilien</div>
          <div className="text-xs text-slate-400">
            Makler, Objekte, Besichtigungen, Nachbetreuung.
          </div>
        </button>

        <button
          onClick={() => selectVertical("finance")}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-emerald-500"
        >
          <div className="font-semibold">Finanzberatung</div>
          <div className="text-xs text-slate-400">
            Vorsorge, Finanzierung, Struktur-Check.
          </div>
        </button>

        <button
          onClick={() => selectVertical("chief")}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-emerald-500"
        >
          <div className="font-semibold">CHIEF / Allgemein</div>
          <div className="text-xs text-slate-400">
            Generalistischer Modus für mehrere Bereiche.
          </div>
        </button>
      </div>
    </div>
  );
}

