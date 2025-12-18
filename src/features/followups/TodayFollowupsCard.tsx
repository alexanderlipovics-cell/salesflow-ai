import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { FollowUpStage, FollowUpChannel, FollowUpTone } from "./FollowUpPanel";

export type DueFollowUpItem = {
  id: string;
  lead_id?: string | null;
  lead_name: string;
  branch: string;
  stage: FollowUpStage;
  channel: FollowUpChannel;
  tone: FollowUpTone;
  context?: string | null;
  due_at: string;
  last_result?: string | null;
};

interface TodayFollowupsCardProps {
  onOpenFollowUp?: (item: DueFollowUpItem) => void;
}

export function TodayFollowupsCard({ onOpenFollowUp }: TodayFollowupsCardProps) {
  const [items, setItems] = useState<DueFollowUpItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await api.get<DueFollowUpItem[]>("/followups/due-today", {
          signal: controller.signal,
        });
        if (!isMounted) {
          return;
        }

        setItems(data ?? []);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        if ((err as Error).name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : "Unbekannter Fehler beim Laden der Follow-ups.";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const title = "Heute fällige Follow-ups";
  const visibleItems = items.slice(0, 8);
  const remainingCount = Math.max(items.length - visibleItems.length, 0);

  const handleOpen = (item: DueFollowUpItem) => {
    if (onOpenFollowUp) {
      onOpenFollowUp(item);
      return;
    }
    const params = new URLSearchParams({
      name: item.lead_name,
      branch: item.branch,
      stage: item.stage,
      channel: item.channel,
      tone: item.tone,
    });
    const context = item.context || item.last_result;
    if (context) {
      params.set("context", context);
    }
    navigate(`/follow-ups?${params.toString()}`);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Tages-Cockpit</p>
          <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
          <p className="text-xs text-slate-400">
            Deine wichtigsten Kontakte für heute auf einen Blick.
          </p>
        </div>
        {isLoading && (
          <span className="text-[11px] text-slate-400" role="status">
            lädt …
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          Heute sind keine Follow-ups fällig 🎉
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-4 space-y-2">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-50">
                  {item.lead_name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatBranchStage(item.branch, item.stage)} · {formatChannel(item.channel)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">
                  {formatDueTime(item.due_at)}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpen(item)}
                  className="text-[11px] rounded-full border border-emerald-500 px-3 py-1 font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-black"
                >
                  Follow-up öffnen
                </button>
              </div>
            </article>
          ))}
          {remainingCount > 0 && (
            <p className="text-[11px] text-slate-500">
              +{remainingCount} weitere im Follow-up Panel
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function formatBranchStage(branch: string, stage: FollowUpStage): string {
  const branchLabel: Record<string, string> = {
    network_marketing: "Network",
    immo: "Immo",
    finance: "Finance",
    coaching: "Coaching",
    generic: "Sales",
  };
  const stageLabel: Record<FollowUpStage, string> = {
    first_contact: "Erstkontakt",
    followup1: "Follow-up 1",
    followup2: "Follow-up 2",
    reactivation: "Reaktivierung",
  };
  const branchText = branchLabel[branch] ?? branch;
  const stageText = stageLabel[stage] ?? "Follow-up";
  return `${branchText} · ${stageText}`;
}

function formatChannel(channel: FollowUpChannel): string {
  const channelLabel: Record<FollowUpChannel, string> = {
    whatsapp: "WhatsApp",
    email: "E-Mail",
    dm: "Social DM",
  };
  return channelLabel[channel] ?? "Nachricht";
}

function formatDueTime(dueAt: string): string {
  if (!dueAt) {
    return "Heute";
  }
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) {
    return "Heute";
  }
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

