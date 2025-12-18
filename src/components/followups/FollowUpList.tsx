/**
 * Follow-Up List Component
 * 
 * Zeigt alle heute fälligen Follow-ups mit:
 * - Prioritäts-Badge (CRITICAL, HIGH, MEDIUM, LOW)
 * - Swipe Actions (GO, Snooze, Done)
 * - AI-generierte Nachrichten
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  Clock, 
  Zap, 
  ChevronRight,
  MoreHorizontal,
  Send,
  Edit2,
  Copy,
} from 'lucide-react';

// Types
interface FollowUpSuggestion {
  lead_id: string;
  workspace_id: string;
  owner_id: string;
  sequence_id?: string;
  step_id?: string;
  recommended_channel: 'whatsapp' | 'sms' | 'email' | 'phone' | 'instagram_dm';
  recommended_time: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  meta: {
    sequence_name?: string;
    step_action?: string;
    lead_name?: string;
    lead_avatar?: string;
  };
}

interface FollowUpListProps {
  followUps?: FollowUpSuggestion[];
  isLoading?: boolean;
  onAction?: (followUp: FollowUpSuggestion, action: 'go' | 'snooze' | 'done') => void;
  onGenerateMessage?: (leadId: string) => void;
}

// Constants
const PRIORITY_CONFIG = {
  critical: { 
    label: 'KRITISCH', 
    color: 'bg-red-500', 
    textColor: 'text-red-500',
    bgLight: 'bg-red-100',
    icon: '🔴',
  },
  high: { 
    label: 'HOCH', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-500',
    bgLight: 'bg-orange-100',
    icon: '🟠',
  },
  medium: { 
    label: 'MITTEL', 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-500',
    bgLight: 'bg-yellow-100',
    icon: '🟡',
  },
  low: { 
    label: 'NIEDRIG', 
    color: 'bg-green-500', 
    textColor: 'text-green-500',
    bgLight: 'bg-green-100',
    icon: '🟢',
  },
};

const CHANNEL_ICONS = {
  whatsapp: { icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-100' },
  sms: { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-100' },
  email: { icon: Mail, color: 'text-purple-500', bg: 'bg-purple-100' },
  phone: { icon: Phone, color: 'text-orange-500', bg: 'bg-orange-100' },
  instagram_dm: { icon: MessageSquare, color: 'text-pink-500', bg: 'bg-pink-100' },
};

// Demo Data
const DEMO_FOLLOWUPS: FollowUpSuggestion[] = [
  {
    lead_id: '1',
    workspace_id: 'ws1',
    owner_id: 'user1',
    recommended_channel: 'whatsapp',
    recommended_time: new Date().toISOString(),
    priority: 'critical',
    reason: 'Follow-up für Lisa | Sequenz-Step: video_einladung | Score: 75',
    meta: {
      sequence_name: 'Interessent → Partner',
      step_action: 'Video-Einladung',
      lead_name: 'Lisa Müller',
    },
  },
  {
    lead_id: '2',
    workspace_id: 'ws1',
    owner_id: 'user1',
    recommended_channel: 'phone',
    recommended_time: new Date().toISOString(),
    priority: 'high',
    reason: 'Follow-up für Max | Sequenz-Step: anruf_versuch | Score: 55',
    meta: {
      sequence_name: 'Interessent → Partner',
      step_action: 'Anruf-Versuch',
      lead_name: 'Max Schmidt',
    },
  },
  {
    lead_id: '3',
    workspace_id: 'ws1',
    owner_id: 'user1',
    recommended_channel: 'instagram_dm',
    recommended_time: new Date().toISOString(),
    priority: 'medium',
    reason: 'Follow-up für Sarah | Sequenz-Step: sanfter_reminder',
    meta: {
      sequence_name: 'Ghosted → Reaktivierung',
      step_action: 'Sanfter Reminder',
      lead_name: 'Sarah Weber',
    },
  },
];

// Components
const FollowUpCard: React.FC<{
  followUp: FollowUpSuggestion;
  onAction: (action: 'go' | 'snooze' | 'done') => void;
  onGenerateMessage: () => void;
}> = ({ followUp, onAction, onGenerateMessage }) => {
  const [showMessage, setShowMessage] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const priority = PRIORITY_CONFIG[followUp.priority];
  const channel = CHANNEL_ICONS[followUp.recommended_channel];
  const ChannelIcon = channel.icon;
  
  const handleGenerateMessage = async () => {
    setIsGenerating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setGeneratedMessage(
      `Hey ${followUp.meta.lead_name?.split(' ')[0]}! 👋\n\n` +
      `Ich melde mich nochmal kurz wegen unserem Gespräch letzte Woche. ` +
      `Hast du dir das Video anschauen können? Bin gespannt auf dein Feedback! 😊`
    );
    setIsGenerating(false);
    setShowMessage(true);
  };
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-3"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        {/* Channel Icon */}
        <div className={`w-12 h-12 rounded-full ${channel.bg} flex items-center justify-center`}>
          <ChannelIcon className={`w-6 h-6 ${channel.color}`} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900">{followUp.meta.lead_name}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priority.bgLight} ${priority.textColor}`}>
              {priority.icon} {priority.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">
            {followUp.meta.step_action} • {followUp.meta.sequence_name}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAction('snooze')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Snooze"
          >
            <Clock className="w-5 h-5" />
          </button>
          <button
            onClick={() => onAction('go')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            GO <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* AI Message Section */}
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
        {!showMessage ? (
          <button
            onClick={handleGenerateMessage}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-2 text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"
                />
                <span>Nachricht wird generiert...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>AI-Nachricht generieren</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-gray-700 text-sm whitespace-pre-line">{generatedMessage}</p>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">
                <Send className="w-4 h-4" />
                Senden
              </button>
              <button className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Main Component
export const FollowUpList: React.FC<FollowUpListProps> = ({
  followUps = DEMO_FOLLOWUPS,
  isLoading = false,
  onAction,
  onGenerateMessage,
}) => {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  
  const handleAction = (followUp: FollowUpSuggestion, action: 'go' | 'snooze' | 'done') => {
    if (action === 'done') {
      setCompletedIds(prev => new Set([...prev, followUp.lead_id]));
    }
    onAction?.(followUp, action);
  };
  
  const visibleFollowUps = followUps.filter(f => !completedIds.has(f.lead_id));
  
  // Group by priority
  const critical = visibleFollowUps.filter(f => f.priority === 'critical');
  const high = visibleFollowUps.filter(f => f.priority === 'high');
  const medium = visibleFollowUps.filter(f => f.priority === 'medium');
  const low = visibleFollowUps.filter(f => f.priority === 'low');
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (visibleFollowUps.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-8 text-center shadow-sm"
      >
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="font-bold text-gray-800 text-lg mb-1">Alle Follow-ups erledigt!</h3>
        <p className="text-gray-500">Du bist ein Rockstar! Genieß deinen Tag.</p>
      </motion.div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{critical.length}</div>
          <div className="text-xs text-red-500">Kritisch</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">{high.length}</div>
          <div className="text-xs text-orange-500">Hoch</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{medium.length}</div>
          <div className="text-xs text-yellow-500">Mittel</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{low.length}</div>
          <div className="text-xs text-green-500">Niedrig</div>
        </div>
      </div>
      
      {/* Follow-Up Cards */}
      <AnimatePresence>
        {visibleFollowUps.map(followUp => (
          <FollowUpCard
            key={followUp.lead_id}
            followUp={followUp}
            onAction={(action) => handleAction(followUp, action)}
            onGenerateMessage={() => onGenerateMessage?.(followUp.lead_id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FollowUpList;

