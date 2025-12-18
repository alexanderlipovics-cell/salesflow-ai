/**
 * QuickLogButtons Component
 * 
 * Schnelle Buttons zum Loggen häufiger Interaktionen.
 */

import { useState } from 'react';
import { Phone, MessageCircle, FileText, Calendar } from 'lucide-react';
import { AddInteractionModal } from './AddInteractionModal';
import type { InteractionType, InteractionChannel } from '@/types/interactions';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface QuickLogButtonsProps {
  leadId: string;
  leadName?: string;
  /** Callback nach erfolgreichem Speichern */
  onInteractionLogged?: () => void;
  /** Kompaktes Layout */
  compact?: boolean;
  /** Nur Icons anzeigen */
  iconOnly?: boolean;
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  type: InteractionType;
  channel: InteractionChannel;
  color: string;
  hoverColor: string;
  borderColor: string;
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'call',
    icon: <Phone className="h-4 w-4" />,
    label: 'Anruf loggen',
    shortLabel: 'Anruf',
    type: 'call_outbound',
    channel: 'phone',
    color: 'text-blue-400',
    hoverColor: 'hover:bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'dm',
    icon: <MessageCircle className="h-4 w-4" />,
    label: 'DM gesendet',
    shortLabel: 'DM',
    type: 'dm_sent',
    channel: 'whatsapp',
    color: 'text-emerald-400',
    hoverColor: 'hover:bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'note',
    icon: <FileText className="h-4 w-4" />,
    label: 'Notiz',
    shortLabel: 'Notiz',
    type: 'note',
    channel: 'other',
    color: 'text-amber-400',
    hoverColor: 'hover:bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'meeting',
    icon: <Calendar className="h-4 w-4" />,
    label: 'Meeting',
    shortLabel: 'Meeting',
    type: 'meeting_scheduled',
    channel: 'in_person',
    color: 'text-purple-400',
    hoverColor: 'hover:bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
];

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export function QuickLogButtons({
  leadId,
  leadName,
  onInteractionLogged,
  compact = false,
  iconOnly = false,
}: QuickLogButtonsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);

  const handleActionClick = (action: QuickAction) => {
    setSelectedAction(action);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedAction(null);
  };

  const handleSuccess = () => {
    onInteractionLogged?.();
  };

  return (
    <>
      <div className={`flex ${compact ? 'gap-1' : 'gap-2'} flex-wrap`}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            title={action.label}
            className={`
              flex items-center gap-1.5 rounded-lg border transition
              ${action.color} ${action.hoverColor} ${action.borderColor}
              ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
              ${iconOnly ? 'px-2' : ''}
            `}
          >
            {action.icon}
            {!iconOnly && (
              <span className="font-medium">
                {compact ? action.shortLabel : action.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Modal */}
      <AddInteractionModal
        leadId={leadId}
        leadName={leadName}
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        preselectedType={selectedAction?.type}
        preselectedChannel={selectedAction?.channel}
      />
    </>
  );
}

export default QuickLogButtons;

