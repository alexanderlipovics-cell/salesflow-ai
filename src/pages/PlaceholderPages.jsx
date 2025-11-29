import { Sparkles } from "lucide-react";

const PlaceholderPage = ({
  kicker,
  title,
  description,
  bullets = [],
  ctaLabel = "Bald verfügbar",
}) => (
  <div className="space-y-6">
    <header className="space-y-3">
      <p className="text-xs uppercase tracking-[0.5em] text-gray-500">{kicker}</p>
      <h1 className="text-3xl font-semibold text-white">{title}</h1>
      <p className="text-sm text-gray-400">{description}</p>
    </header>

    <section className="rounded-3xl border border-white/5 bg-gray-950/70 p-6 text-sm text-gray-300">
      <ul className="space-y-3">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-3 rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-left text-base text-white"
          >
            <Sparkles className="mt-1 h-4 w-4 text-salesflow-accent" />
            <p>{bullet}</p>
          </li>
        ))}
      </ul>
      <button className="mt-6 w-full rounded-2xl border border-dashed border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
        {ctaLabel}
      </button>
    </section>
  </div>
);

export const SpeedHunterPage = () => (
  <PlaceholderPage
    kicker="Sales Power"
    title="Speed-Hunter"
    description="Batch-Nachrichten mit persönlichem Touch. Nutze Signals & Muted Leads aus Daily Command."
    bullets={[
      "Wähle bis zu 50 Leads pro Batch – AI personalisiert jeden Touch.",
      "Verbinde LinkedIn, WhatsApp und E-Mail in einem Flow.",
      "Live-Preview bevor die Sequenz startet.",
    ]}
    ctaLabel="Batch erstellen"
  />
);

export const PhoenixPage = () => (
  <PlaceholderPage
    kicker="Sales Power"
    title="Phönix"
    description="Rette Deals kurz vor dem Absprung. Phoenix analysiert den Verlauf und schlägt Re-Engage Schritte vor."
    bullets={[
      "AI bewertet Kaufwahrscheinlichkeit und empfiehlt Reaktivierungen.",
      "Automatische Timings für Follow-ups pro Deal-Phase.",
      "Synchronisiert Aufgaben mit Daily Command.",
    ]}
    ctaLabel="Phoenix Sequenz planen"
  />
);

export const ScreenshotAIPage = () => (
  <PlaceholderPage
    kicker="Import"
    title="Screenshot AI"
    description="Fotografiere Notizen, Whiteboards oder Visitenkarten. Screenshot AI extrahiert Kontakte, Tags und nächste Schritte."
    bullets={[
      "OCR optimiert für Vertriebs-Dokumente.",
      "Lead-Kontext wird automatisch angereichert.",
      "Direkter Export in Interessenten oder Kunden.",
    ]}
    ctaLabel="Screenshot hochladen"
  />
);

export const CsvImportPage = () => (
  <PlaceholderPage
    kicker="Import"
    title="CSV Import"
    description="Bestandskunden importieren – inklusive Status, Tags und Deal Value. Ideal für Kick-off Sprints."
    bullets={[
      "Spaltenzuordnung mit AI-Vorschlägen.",
      "Detect Duplicate & Merge in Mein Team.",
      "Speed-Hunter aktiviert Auto-Follow-ups nach dem Import.",
    ]}
    ctaLabel="CSV Upload starten"
  />
);

export const LeadsProspectsPage = () => (
  <PlaceholderPage
    kicker="Pipeline"
    title="Interessenten"
    description="Alle Kontakte im Pre-Customer Stadium. Filtere nach Signals, Owner oder Speed-Hunter Status."
    bullets={[
      "Board-Ansicht nach Status und nächster Aktion.",
      "Phoenix Alerts anzeigen.",
      "Exports nach Segment möglich.",
    ]}
    ctaLabel="Filter speichern"
  />
);

export const LeadsCustomersPage = () => (
  <PlaceholderPage
    kicker="Pipeline"
    title="Kunden"
    description="Aktive Kunden und Upsell-Chancen. Sieh sofort, wer eine neue Initiative braucht."
    bullets={[
      "Renewal Radar & Health Score inklusive.",
      "Bestandskunden-Import landet hier.",
      "Trigger direkte Phoenix Upsell Sequenzen.",
    ]}
    ctaLabel="Customer View konfigurieren"
  />
);

export const NetworkTeamPage = () => (
  <PlaceholderPage
    kicker="Network"
    title="Mein Team"
    description="Verwalte Seats, Rollen und Playbook-Zugriffe. Balanciere Daily Command zwischen Teammitgliedern."
    bullets={[
      "Rollenzuweisung mit Feature-Gates.",
      "Sicht auf AI Load & Credits.",
      "Sync mit Slack & Google Workspace.",
    ]}
    ctaLabel="Teammitglied einladen"
  />
);

export const NetworkDuplicationPage = () => (
  <PlaceholderPage
    kicker="Network"
    title="Duplikation"
    description="Vermeide doppelte Leads und Kontakte. AI erkennt ähnliche Signale und schlägt Merges vor."
    bullets={[
      "Fuzzy Matching auf Name, Domain & Phone.",
      "Signals zeigen, welcher Datensatz prioritär ist.",
      "Merge-Historie auditierbar.",
    ]}
    ctaLabel="Duplikate prüfen"
  />
);

export const EinwandKillerPage = () => (
  <PlaceholderPage
    kicker="Sales Power"
    title="Einwand-Killer"
    description="Transformiere Einwände in Conversational Wins. AI liefert Snippets im Tonfall deines Playbooks."
    bullets={[
      "Bibliothek mit Top-Performer Antworten.",
      "Aufrufbar direkt im Chat & Speed-Hunter.",
      "Auto-Learn aus Closed Won Deals.",
    ]}
    ctaLabel="Einwand hinzufügen"
  />
);

export const AlleToolsPage = () => (
  <PlaceholderPage
    kicker="Direkter Zugriff"
    title="Alle Tools"
    description="Sammelübersicht aller Module – Daily Command, Speed-Hunter, Phoenix, Screenshot AI, CSV Import, Netzwerk."
    bullets={[
      "Suche Tools nach Team, Ziel oder KPI.",
      "Favoriten pinnen in die Sidebar.",
      "Roadmap-Einblick für kommende Features.",
    ]}
    ctaLabel="Toolboard konfigurieren"
  />
);
