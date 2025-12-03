import { useState, useMemo } from "react";
import {
  Check,
  Clock,
  Copy,
  MessageCircle,
  Phone,
  Mail,
  Linkedin,
  Instagram,
  MoreHorizontal,
  ChevronRight,
  AlertCircle,
  X,
  Pause,
  UserX,
  Trophy,
  SkipForward,
  Target,
  Brain,
} from "lucide-react";
import type {
  TodayFollowUpTask,
  TaskOutcome,
  FollowUpPhase,
  FollowUpChannel,
  TaskUrgency,
} from "@/types/followUp";
import {
  PHASE_CONFIGS,
  STEP_CONFIGS,
  CHANNEL_LABELS,
  URGENCY_CONFIGS,
  OUTCOME_LABELS,
} from "@/types/followUp";
import {
  useMessageTemplate,
  getVerticalLabel,
  type LeadForPersonalization,
} from "@/hooks/useMessageTemplates";
import { QuickLogButtons } from "@/components/leads/QuickLogButtons";
import { logDmSent } from "@/hooks/useInteractionLog";
import { QuickObjectionHelper } from "@/components/objections/QuickObjectionHelper";
import { LeadContextChat } from "@/components/chat/LeadContextChat";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface FollowUpTaskCardProps {
  task: TodayFollowUpTask;
  generatedMessage?: string;
  onComplete: (outcome: TaskOutcome, messageSent?: string) => Promise<void>;
  onSkip: () => Promise<void>;
  onMarkReplied: () => Promise<void>;
  onMarkConverted: () => Promise<void>;
  onMarkLost: () => Promise<void>;
  onGenerateMessage?: () => void;
  onOpenContact?: (leadId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getChannelIcon(channel: FollowUpChannel) {
  switch (channel) {
    case "whatsapp":
      return MessageCircle;
    case "instagram":
      return Instagram;
    case "linkedin":
      return Linkedin;
    case "email":
      return Mail;
    case "phone":
      return Phone;
    default:
      return MessageCircle;
  }
}

function formatStepLabel(stepCode: string): string {
  const config = STEP_CONFIGS.find((s) => s.code === stepCode);
  return config?.label ?? stepCode;
}

function formatShortStep(stepCode: string): string {
  const config = STEP_CONFIGS.find((s) => s.code === stepCode);
  return config?.shortLabel ?? stepCode;
}

function formatDaysOverdue(days: number): string {
  if (days === 0) return "Heute fällig";
  if (days === 1) return "1 Tag überfällig";
  if (days > 0) return `${days} Tage überfällig`;
  if (days === -1) return "Morgen fällig";
  return `In ${Math.abs(days)} Tagen`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ──────────────────────────────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: FollowUpPhase }) {
  const config = PHASE_CONFIGS[phase];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${config.bgColor} ${config.color} border ${config.borderColor}`}
    >
      {config.label}
    </span>
  );
}

function UrgencyBadge({ urgency, daysOverdue }: { urgency: TaskUrgency; daysOverdue: number }) {
  const config = URGENCY_CONFIGS[urgency];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bgColor} ${config.color}`}
    >
      {urgency === "overdue" && <AlertCircle className="h-3 w-3" />}
      {urgency === "today" && <Clock className="h-3 w-3" />}
      {formatDaysOverdue(daysOverdue)}
    </span>
  );
}

function VerticalTemplateBadge({ vertical, isActive }: { vertical: string; isActive: boolean }) {
  if (!isActive) return null;
  
  const label = getVerticalLabel(vertical as any);
  
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
      <Target className="h-3 w-3" />
      {label}-Template
    </span>
  );
}

function ChannelButton({
  channel,
  isPreferred,
  onClick,
}: {
  channel: FollowUpChannel;
  isPreferred?: boolean;
  onClick?: () => void;
}) {
  const Icon = getChannelIcon(channel);
  const label = CHANNEL_LABELS[channel];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition
        ${
          isPreferred
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
        }`}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  disabled,
}: {
  icon: typeof Check;
  label: string;
  onClick: () => void;
  variant?: "default" | "success" | "warning" | "danger";
  disabled?: boolean;
}) {
  const variants = {
    default: "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800",
    success: "border-emerald-500/40 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-500/10",
    warning: "border-amber-500/40 text-amber-400 hover:border-amber-400 hover:bg-amber-500/10",
    danger: "border-red-500/40 text-red-400 hover:border-red-400 hover:bg-red-500/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────

export function FollowUpTaskCard({
  task,
  generatedMessage,
  onComplete,
  onSkip,
  onMarkReplied,
  onMarkConverted,
  onMarkLost,
  onGenerateMessage,
  onOpenContact,
  isExpanded = false,
  onToggleExpand,
}: FollowUpTaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showOutcomeMenu, setShowOutcomeMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showObjectionHelper, setShowObjectionHelper] = useState(false);
  const [showChiefChat, setShowChiefChat] = useState(false);

  const channel = task.preferred_channel ?? task.default_channel;
  const ChannelIcon = getChannelIcon(channel);

  // Prepare lead data for personalization
  const leadForPersonalization: LeadForPersonalization = useMemo(() => ({
    name: task.lead_name,
    company: task.lead_company,
    vertical: task.lead_vertical,
  }), [task.lead_name, task.lead_company, task.lead_vertical]);

  // Fetch branchen-spezifisches Template
  const {
    personalizedMessage: templateMessage,
    isVerticalSpecific,
    usedVertical,
    isLoading: isTemplateLoading,
  } = useMessageTemplate({
    stepKey: task.current_step_code,
    vertical: task.lead_vertical,
    channel: channel,
    lead: leadForPersonalization,
    enabled: isExpanded, // Only fetch when card is expanded
  });

  // Use generated message if available, otherwise use template message
  const displayMessage = generatedMessage || templateMessage;

  // ──────────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (outcome: TaskOutcome) => {
    setShowOutcomeMenu(false);
    await handleAction(async () => {
      await onComplete(outcome, generatedMessage);
      // Automatisch DM-Interaktion loggen wenn Nachricht gesendet wurde
      if (outcome === 'sent' && task.lead_id) {
        const channelMap: Record<string, 'whatsapp' | 'instagram' | 'linkedin'> = {
          whatsapp: 'whatsapp',
          instagram: 'instagram',
          linkedin: 'linkedin',
        };
        const interactionChannel = channelMap[channel] || 'whatsapp';
        await logDmSent(task.lead_id, interactionChannel, generatedMessage || displayMessage);
      }
    });
  };

  const handleCopyMessage = async () => {
    if (!displayMessage) return;
    try {
      await navigator.clipboard.writeText(displayMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-200
        ${
          task.urgency === "overdue"
            ? "border-red-500/30 bg-gradient-to-br from-slate-950 to-red-950/20"
            : task.urgency === "today"
            ? "border-emerald-500/20 bg-gradient-to-br from-slate-950 to-emerald-950/10"
            : "border-slate-800 bg-slate-950/80"
        }
        ${isExpanded ? "ring-1 ring-emerald-500/30" : "hover:border-slate-700"}
      `}
    >
      {/* Main Content */}
      <div className="p-4 sm:p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          {/* Lead Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className="cursor-pointer truncate text-base font-semibold text-white hover:text-emerald-300"
                onClick={() => onOpenContact?.(task.lead_id)}
              >
                {task.lead_name || "Unbekannt"}
              </h3>
              <PhaseBadge phase={task.phase} />
              <UrgencyBadge urgency={task.urgency} daysOverdue={task.days_overdue} />
              <VerticalTemplateBadge vertical={usedVertical} isActive={isVerticalSpecific} />
            </div>

            {/* Company & Meta */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              {task.lead_company && (
                <span className="font-medium text-slate-300">{task.lead_company}</span>
              )}
              {task.lead_vertical && <span>• {task.lead_vertical}</span>}
              <span className="flex items-center gap-1">
                <ChannelIcon className="h-3 w-3" />
                {formatShortStep(task.current_step_code)}
              </span>
              <span>• {task.contact_count} Kontakte</span>
              {task.reply_count > 0 && (
                <span className="text-emerald-400">• {task.reply_count} Antworten</span>
              )}
            </div>
          </div>

          {/* Expand Toggle */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          </button>
        </div>

        {/* Quick Actions Row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Primary Channel Button */}
          <ChannelButton channel={channel} isPreferred />

          {/* Generate Message */}
          {onGenerateMessage && (
            <button
              type="button"
              onClick={onGenerateMessage}
              className="flex items-center gap-1.5 rounded-xl border border-salesflow-accent/40 bg-salesflow-accent/10 px-3 py-1.5 text-xs font-semibold text-salesflow-accent transition hover:bg-salesflow-accent/20"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Nachricht generieren
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Quick Complete */}
          <QuickAction
            icon={Check}
            label="Erledigt"
            onClick={() => setShowOutcomeMenu(true)}
            variant="success"
            disabled={isLoading}
          />

          {/* Skip */}
          <QuickAction
            icon={SkipForward}
            label="Morgen"
            onClick={() => handleAction(onSkip)}
            disabled={isLoading}
          />

          {/* More Actions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOutcomeMenu(!showOutcomeMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {/* Outcome Menu */}
            {showOutcomeMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowOutcomeMenu(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                  <div className="p-1">
                    <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500">
                      Ergebnis wählen
                    </p>
                    {(
                      [
                        "sent",
                        "no_answer",
                        "replied",
                        "interested",
                        "meeting_scheduled",
                        "not_interested",
                        "call_back",
                        "wrong_number",
                      ] as TaskOutcome[]
                    ).map((outcome) => (
                      <button
                        key={outcome}
                        type="button"
                        onClick={() => handleComplete(outcome)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-800"
                      >
                        {OUTCOME_LABELS[outcome]}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-800 p-1">
                    <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500">
                      Status ändern
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOutcomeMenu(false);
                        handleAction(onMarkReplied);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-emerald-400 transition hover:bg-slate-800"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Antwort erhalten
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOutcomeMenu(false);
                        handleAction(onMarkConverted);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-amber-400 transition hover:bg-slate-800"
                    >
                      <Trophy className="h-4 w-4" />
                      Konvertiert
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOutcomeMenu(false);
                        handleAction(onMarkLost);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition hover:bg-slate-800"
                    >
                      <UserX className="h-4 w-4" />
                      Verloren
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div className="border-t border-slate-800/50 bg-slate-900/50 p-4 sm:p-5">
          {/* Step Progress */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">
              Sequenz-Fortschritt
            </p>
            <div className="flex items-center gap-1">
              {STEP_CONFIGS.map((step, index) => {
                const isCurrentStep = step.code === task.current_step_code;
                const isPastStep =
                  STEP_CONFIGS.findIndex((s) => s.code === task.current_step_code) > index;

                return (
                  <div key={step.code} className="flex items-center">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold transition
                        ${
                          isCurrentStep
                            ? "bg-emerald-500 text-black"
                            : isPastStep
                            ? "bg-slate-700 text-slate-300"
                            : "bg-slate-800 text-slate-600"
                        }`}
                      title={step.label}
                    >
                      {isPastStep ? <Check className="h-3 w-3" /> : index + 1}
                    </div>
                    {index < STEP_CONFIGS.length - 1 && (
                      <div
                        className={`h-0.5 w-3 ${
                          isPastStep ? "bg-slate-700" : "bg-slate-800"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Aktuell: <span className="text-white">{formatStepLabel(task.current_step_code)}</span>
            </p>
          </div>

          {/* Contact Info */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {task.lead_phone && (
              <a
                href={`tel:${task.lead_phone}`}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                <Phone className="h-4 w-4 text-slate-500" />
                {task.lead_phone}
              </a>
            )}
            {task.lead_email && (
              <a
                href={`mailto:${task.lead_email}`}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                <Mail className="h-4 w-4 text-slate-500" />
                {task.lead_email}
              </a>
            )}
            {task.lead_instagram && (
              <a
                href={`https://instagram.com/${task.lead_instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                <Instagram className="h-4 w-4 text-slate-500" />
                {task.lead_instagram}
              </a>
            )}
            {task.lead_linkedin && (
              <a
                href={task.lead_linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                <Linkedin className="h-4 w-4 text-slate-500" />
                LinkedIn
              </a>
            )}
          </div>

          {/* Personalized Message (from template or generated) */}
          {displayMessage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {generatedMessage ? "Generierte Nachricht" : "Personalisierte Vorlage"}
                  </p>
                  {isVerticalSpecific && !generatedMessage && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 text-[9px] font-medium text-cyan-400">
                      <Target className="h-2.5 w-2.5" />
                      {getVerticalLabel(usedVertical as any)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowObjectionHelper(true)}
                    className="flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[10px] font-medium text-purple-400 transition hover:border-purple-500/50 hover:bg-purple-500/20"
                    title="Einwand-Hilfe öffnen"
                  >
                    <Brain className="h-3 w-3" />
                    Einwand?
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-medium text-slate-400 transition hover:border-slate-500 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        Kopiert
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Kopieren
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-800 p-3">
                <p className="whitespace-pre-wrap text-sm text-white">{displayMessage}</p>
              </div>
            </div>
          )}

          {/* Loading state for template */}
          {isTemplateLoading && !displayMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-800 p-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-500" />
              <p className="text-sm text-slate-400">Lade Nachrichtenvorlage...</p>
            </div>
          )}

          {/* Fallback to task.message_template if no displayMessage and not loading */}
          {!displayMessage && !isTemplateLoading && task.message_template && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Standard-Vorlage
              </p>
              <div className="rounded-xl border border-slate-800 bg-slate-800 p-3">
                <p className="whitespace-pre-wrap text-sm text-slate-400">
                  {task.message_template}
                </p>
              </div>
            </div>
          )}

          {/* Quick Log Buttons & CHIEF */}
          <div className="mt-4 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Interaktion loggen
              </p>
              <button
                type="button"
                onClick={() => setShowChiefChat(true)}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-500/20"
              >
                <Brain className="h-3.5 w-3.5" />
                🤖 CHIEF fragen
              </button>
            </div>
            <QuickLogButtons
              leadId={task.lead_id}
              leadName={task.lead_name || undefined}
              compact
            />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
        </div>
      )}

      {/* Objection Helper Modal */}
      <QuickObjectionHelper
        isOpen={showObjectionHelper}
        onClose={() => setShowObjectionHelper(false)}
        vertical={task.lead_vertical}
      />

      {/* CHIEF Chat Modal */}
      {showChiefChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl h-[80vh] rounded-2xl overflow-hidden">
            <LeadContextChat
              leadId={task.lead_id}
              leadName={task.lead_name || undefined}
              isModal
              onClose={() => setShowChiefChat(false)}
            />
          </div>
        </div>
      )}
    </article>
  );
}

export default FollowUpTaskCard;


