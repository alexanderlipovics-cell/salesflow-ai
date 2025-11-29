import DailyCommandCard from "../features/daily-command/DailyCommandCard";

const DailyCommandPage = () => {
  return (
    <div className="space-y-8 text-white">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
          Fokus Heute
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold">Daily Command</h1>
            <p className="mt-3 text-base text-gray-400">
              Deine persönliche Ops-Liste für Pipeline-Moves der nächsten Tage.
              Aufgaben werden live aus Supabase synchronisiert.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/20 px-6 py-4 text-sm text-gray-300">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Hinweis
            </p>
            <p className="mt-2">
              Passe Horizonte und Limits direkt in der Komponente an, um mehr
              Signale zu laden.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <DailyCommandCard horizonDays={5} limit={30} />
        <aside className="space-y-4 rounded-3xl border border-white/5 bg-gray-900/40 p-6 text-sm text-gray-300">
          <h2 className="text-lg font-semibold text-white">
            Nächste Schritte beschleunigen
          </h2>
          <p>
            Nutze die Insights, um Sequenzen zu starten, Blocker zu entfernen und
            Deals zu committen.
          </p>
          <ul className="space-y-3">
            <li className="rounded-2xl border border-white/5 px-4 py-3">
              🔁 Folge-Aktion planen, falls kein next_action_at gesetzt ist.
            </li>
            <li className="rounded-2xl border border-white/5 px-4 py-3">
              🧊 Cold Deals in Phoenix verschieben, um sie zu reaktivieren.
            </li>
            <li className="rounded-2xl border border-white/5 px-4 py-3">
              📣 Speed-Hunter einsetzen, sobald ≥3 Kontakte pro Account fehlen.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
};

export default DailyCommandPage;
