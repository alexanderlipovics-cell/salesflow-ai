import { ArrowRight, Calendar, Clock } from "lucide-react";
import DailyCommandCard from "../features/daily-command/DailyCommandCard";

const focusAreas = [
  {
    title: "Heute",
    hint: "AI priorisierte Kontakte",
    copy: "5 Leads brauchen heute ein Follow-up. 2 davon ohne geplante nächste Aktion.",
  },
  {
    title: "Nächste 3 Tage",
    hint: "Sequenzen & Deals",
    copy: "Plane Phoenix-Schritte für offene Trials und markiere Deals mit Blockern.",
  },
  {
    title: "Backlog",
    hint: "Ohne Status",
    copy: "12 Kontakte ohne Stage – ziehe sie in Interessenten oder Kunden.",
  },
];

const DailyCommandPage = () => (
  <div className="space-y-8">
    <header className="space-y-3">
      <p className="text-xs uppercase tracking-[0.5em] text-gray-500">
        Heute musst du …
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-semibold text-white">Daily Command</h1>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1 text-xs font-semibold text-gray-300">
          <Calendar className="h-4 w-4" />
          Priorisierte Pipeline
        </span>
      </div>
      <p className="text-sm text-gray-400">
        Deine AI sortiert alle Leads nach Fälligkeit, Deal Value und manuellen Flags.
        Ziehe Aufgaben in die richtige Stage oder triggere direkt Speed-Hunter.
      </p>
    </header>

    <DailyCommandCard horizonDays={5} limit={50} />

    <section className="grid gap-4 md:grid-cols-3">
      {focusAreas.map((area) => (
        <article
          key={area.title}
          className="rounded-3xl border border-white/5 bg-black/30 p-5 text-sm text-gray-300"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
            {area.hint}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">{area.title}</h3>
          <p className="mt-2 leading-relaxed">{area.copy}</p>
        </article>
      ))}
    </section>

    <section className="rounded-3xl border border-white/5 bg-gray-950/70 p-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
            Workflow
          </p>
          <h2 className="text-lg font-semibold">Nächste Schritte planen</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white">
          <ArrowRight className="h-4 w-4" />
          Speed-Hunter öffnen
        </button>
      </header>
      <div className="mt-4 grid gap-4 text-sm text-gray-300 md:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 px-4 py-3">
          <Clock className="h-5 w-5 text-salesflow-accent" />
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
              Fokuszeit
            </p>
            <p className="text-base text-white">25 Minuten Deep Work</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 px-4 py-3">
          <Calendar className="h-5 w-5 text-salesflow-accent" />
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
              Sequenzen
            </p>
            <p className="text-base text-white">3 Phoenix Runs geplant</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 px-4 py-3">
          <ArrowRight className="h-5 w-5 text-salesflow-accent" />
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
              Exporte
            </p>
            <p className="text-base text-white">CSV Sync heute 16:00</p>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default DailyCommandPage;
