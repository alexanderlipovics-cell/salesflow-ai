import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Flame,
  Link2,
  Radar,
  Sparkles,
  Target,
} from "lucide-react";
import clsx from "clsx";

const SPEED_HUNTER_WINDOWS = {
  "24h": {
    stats: [
      { label: "Neue Buying Signals", value: "+58", helper: "12 Accounts ↑" },
      { label: "Intent Intensität", value: "91", helper: "Top 10% ICP" },
      { label: "Net-New Pipeline", value: "€420k", helper: "5 opps entdeckt" },
    ],
    segments: [
      { label: "Dringende Projekte", coverage: 74, helper: "Go-Live < 30d" },
      { label: "Renewals gefährdet", coverage: 38, helper: "Risk Alerts" },
      { label: "Open Playbooks", coverage: 62, helper: "AI Sequenzen" },
    ],
    accounts: [
      {
        id: "nexonic",
        name: "Nexonic GmbH",
        meta: "Series B · 420 MAUs",
        value: "€210k",
        score: 92,
        freshness: "vor 2h",
        owner: "Lena",
        signals: ["Board Pressure", "RFP ready", "Reactivated trial"],
      },
      {
        id: "datagen",
        name: "DataGenics AG",
        meta: "Enterprise · 5 Länder",
        value: "€160k",
        score: 88,
        freshness: "vor 4h",
        owner: "Marco",
        signals: ["Loss Alert", "Champion switched", "Open webhook"],
      },
      {
        id: "altair",
        name: "Altair Systems",
        meta: "Scale-up · 180 reps",
        value: "€85k",
        score: 84,
        freshness: "vor 35m",
        owner: "Sara",
        signals: ["New Buying Unit", "Website spike"],
      },
    ],
    insight:
      "Security-seated Champions lösen aktuell die meisten Buying Signals. Empfohlene Sequenz: WhatsApp intro + Voice Drop.",
  },
  "7d": {
    stats: [
      { label: "Neue Buying Signals", value: "+312", helper: "56 Accounts ↑" },
      { label: "Intent Intensität", value: "84", helper: "Mid-Market Sweetspot" },
      { label: "Net-New Pipeline", value: "€1.9M", helper: "18 opps entdeckt" },
    ],
    segments: [
      { label: "Dringende Projekte", coverage: 62, helper: "Go-Live < 45d" },
      { label: "Renewals gefährdet", coverage: 44, helper: "Risk Alerts" },
      { label: "Open Playbooks", coverage: 70, helper: "AI Sequenzen" },
    ],
    accounts: [
      {
        id: "helios",
        name: "Helios Cloud",
        meta: "Mid-Market · Martech",
        value: "€120k",
        score: 86,
        freshness: "vor 1 Tag",
        owner: "Lena",
        signals: ["Pricing request", "RevOps pinged"],
      },
      {
        id: "omni",
        name: "OmniBuild",
        meta: "Enterprise Construction",
        value: "€340k",
        score: 90,
        freshness: "vor 3 Tagen",
        owner: "Aya",
        signals: ["Vendor shortlist", "Slack app installed"],
      },
    ],
    insight:
      "SMB-Deals stagnieren, während Mid-Market die höchste Intent-Dichte zeigt. Verschiebe SDR Fokus auf Accounts 5-25M ARR.",
  },
  "30d": {
    stats: [
      { label: "Neue Buying Signals", value: "+1.2k", helper: "231 Accounts ↑" },
      { label: "Intent Intensität", value: "77", helper: "Stabil" },
      { label: "Net-New Pipeline", value: "€4.6M", helper: "42 opps entdeckt" },
    ],
    segments: [
      { label: "Dringende Projekte", coverage: 53, helper: "Go-Live < 60d" },
      { label: "Renewals gefährdet", coverage: 47, helper: "Risk Alerts" },
      { label: "Open Playbooks", coverage: 65, helper: "AI Sequenzen" },
    ],
    accounts: [
      {
        id: "aster",
        name: "Aster Mobility",
        meta: "Scale-up Mobility",
        value: "€190k",
        score: 83,
        freshness: "vor 4 Tagen",
        owner: "Marco",
        signals: ["Budget secured", "VP joined call"],
      },
    ],
    insight:
      "Enterprise Renewals erzeugen Unruhe – richte SpeedHunter Alerts auf <120 Tage vor Ablauf um Churn zu vermeiden.",
  },
};

const SpeedHunterPanel = ({
  windowedData = SPEED_HUNTER_WINDOWS,
  onUpgrade = null,
}) => {
  const windowTabs = useMemo(() => Object.keys(windowedData), [windowedData]);
  const defaultWindow = windowTabs.includes("24h")
    ? "24h"
    : windowTabs[0] || "24h";
  const [selectedWindow, setSelectedWindow] = useState(defaultWindow);
  const [autopilot, setAutopilot] = useState(true);

  const currentWindow = useMemo(() => {
    if (windowedData[selectedWindow]) {
      return windowedData[selectedWindow];
    }
    return windowedData[defaultWindow] || windowedData["24h"];
  }, [defaultWindow, selectedWindow, windowedData]);

  useEffect(() => {
    if (!windowTabs.includes(selectedWindow)) {
      setSelectedWindow(defaultWindow);
    }
  }, [defaultWindow, selectedWindow, windowTabs]);

  const handleUpgrade = () => {
    if (typeof onUpgrade === "function") {
      onUpgrade();
    }
  };

  return (
    <section className="rounded-3xl border border-white/5 bg-gray-950/80 p-6 shadow-2xl">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">
            SpeedHunter Modul
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            Intent Intelligence Monitor
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Vereint Buying Signals, AI-Rankings und Autopilot-Taktiken pro
            Account. Priorisiert Leads nach Impact statt Listen.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {windowTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedWindow(tab)}
              className={clsx(
                "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                selectedWindow === tab
                  ? "bg-white/10 text-white"
                  : "border border-white/10 text-gray-400 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {currentWindow.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/5 bg-gray-900/50 p-4"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              {stat.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {stat.value}
            </p>
            <p className="text-xs text-gray-400">{stat.helper}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/5 bg-black/30 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Autopilot
              </p>
              <p className="text-lg font-semibold text-white">
                Playbooks reagieren live
              </p>
            </div>
            <button
              onClick={() => setAutopilot((prev) => !prev)}
              className={clsx(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                autopilot
                  ? "border-salesflow-accent/50 text-salesflow-accent"
                  : "border-white/10 text-gray-400"
              )}
            >
              {autopilot ? "Aktiv" : "Pausiert"}
            </button>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-salesflow-accent" />
              Voice Drop + WhatsApp Sequenz startet, wenn Score {"≥"} 85
            </li>
            <li className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              Risk Alerts pushen direkt in Slack #rev-room
            </li>
            <li className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              Renewal Accounts werden nach ARPA sortiert
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-gray-900 via-gray-900 to-black p-5">
          <div className="flex items-center gap-2 text-salesflow-accent">
            <Target className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.3em]">
              Decoder Insight
            </span>
          </div>
          <p className="mt-3 text-base text-gray-200">{currentWindow.insight}</p>
          <button
            onClick={handleUpgrade}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-salesflow-accent hover:text-salesflow-accent-strong"
          >
            Playbooks anpassen
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {currentWindow.segments.map((segment) => (
          <div
            key={segment.label}
            className="rounded-2xl border border-white/5 bg-gray-900/40 p-4"
          >
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{segment.label}</span>
              <span>{segment.helper}</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-white/5">
              <div
                className="h-2 rounded-full bg-salesflow-accent"
                style={{ width: `${segment.coverage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Coverage {segment.coverage}%
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {currentWindow.accounts.map((account) => (
          <article
            key={account.id}
            className="rounded-3xl border border-white/5 bg-black/40 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">
                  {account.name}
                </p>
                <p className="text-sm text-gray-400">{account.meta}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-salesflow-accent/40 px-3 py-1 text-xs font-semibold text-salesflow-accent">
                  Score {account.score}
                </span>
                <span className="text-xs text-gray-500">{account.freshness}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {account.signals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-white/10 px-3 py-1 text-gray-300"
                >
                  {signal}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-salesflow-accent" />
                <span>{account.owner}</span>
              </div>
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-gray-500" />
                <span>{account.value} Pipeline</span>
              </div>
              <button className="inline-flex items-center gap-2 text-xs font-semibold text-salesflow-accent hover:text-salesflow-accent-strong">
                Öffne Playbook
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default SpeedHunterPanel;
