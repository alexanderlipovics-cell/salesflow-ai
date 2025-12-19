/**
 * InboxItem Component
 * 
 * Glass-Dashboard Design mit Glassmorphismus-Effekten
 */

import React, { useState } from 'react';
import { MessageCircle, Copy, Send, Instagram, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateContactLink } from '@/utils/contactLinks';
import type { InboxItem } from '@/types/inbox';
import { motion, AnimatePresence } from 'framer-motion';
import { ChiefEditPopup } from './ChiefEditPopup';
import { SnoozeDropdown } from './SnoozeDropdown';

interface InboxItemProps {
  item: InboxItem;
  onSend: () => void;
  onEdit: () => void;
  onSnooze: (hours: number) => Promise<void>;
  onArchive: () => void;
  onComposeMessage?: () => void;
  onMessageUpdated?: (newMessage: string) => void;
  onMarkAsSent?: () => void;
  onReplyReceived?: () => void;
  isProcessing?: boolean;
  isSent?: boolean;
}

export const InboxItemComponent: React.FC<InboxItemProps> = ({
  item,
  onSend,
  onEdit,
  onSnooze,
  onArchive,
  onComposeMessage,
  onMessageUpdated,
  onMarkAsSent,
  onReplyReceived,
  isProcessing = false,
  isSent = false,
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showChiefEdit, setShowChiefEdit] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(item?.action?.message || '');

  // Contact Link generieren
  const contactLink = item?.lead ? generateContactLink(item.lead) : null;

  // Urgency Color based on priority
  const getUrgencyColor = () => {
    if (item.priority === 'hot') return 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]';
    if (item.type === 'ai_approval') return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]';
    if (item.type === 'follow_up') return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
    return 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]';
  };

  // Status Badge
  const getStatusBadge = () => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'new': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Neu' },
      'engaged': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Engaged' },
      'opportunity': { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Opportunity' },
      'follow_up': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Follow-up' },
      'deepdive': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Deepdive' },
    };
    
    // Map item.type to status
    const statusMap: Record<string, string> = {
      'new_lead': 'new',
      'follow_up': 'follow_up',
      'ai_approval': 'opportunity',
      'reminder': 'engaged',
    };
    
    const status = statusMap[item?.type || ''] || 'new';
    const badge = badges[status] || badges['new'];
    return badge;
  };

  // Copy Funktion
  const handleCopy = async () => {
    const messageToCopy = currentMessage || item?.action?.message || '';
    if (!messageToCopy) {
      toast.error('Keine Nachricht zum Kopieren');
      return;
    }
    try {
      await navigator.clipboard.writeText(messageToCopy);
      toast.success('Nachricht kopiert! Füge sie in WhatsApp/Instagram ein.');
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
      toast.error('Fehler beim Kopieren');
    }
  };

  // Mark as Sent Funktion
  const handleMarkAsSentClick = async () => {
    if (onMarkAsSent) {
      try {
        await onMarkAsSent();
        toast.success('Als gesendet markiert ✓');
      } catch (err) {
        console.error('Fehler beim Markieren als gesendet:', err);
        toast.error('Fehler beim Markieren');
      }
    }
  };

  // Open Channel
  const handleOpenChannel = () => {
    if (contactLink) {
      window.open(contactLink.url, '_blank');
    }
  };

  const badge = getStatusBadge();
  const initials = item?.lead?.name?.charAt(0).toUpperCase() || '?';
  const messagePreview = item?.action?.message
    ? `"${item.action.message.slice(0, 60)}${item.action.message.length > 60 ? '...' : ''}"`
    : item?.type === 'new_lead' ? 'Neuer Kontakt' : 'Wartet auf Nachricht...';

  // Erfolgs-Animation nach Senden
  React.useEffect(() => {
    if (isSent) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSent]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isSent ? 0 : 1, y: 0, scale: isSent ? 0.95 : 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="relative group p-5 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-cyan-500/10 hover:-translate-y-1"
    >
      {/* Urgency Indicator */}
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 ${getUrgencyColor()} rounded-r-full`}></div>
      
      <div className="flex items-center justify-between ml-4">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xl font-bold border border-slate-600 text-cyan-400 flex-shrink-0">
            {item?.lead?.avatar ? (
              <img
                src={item.lead.avatar}
                alt={item?.lead?.name || 'Kontakt'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          
          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-semibold truncate">{item?.lead?.name || 'Unbekannt'}</h3>
              <span className={`text-[10px] ${badge.bg} ${badge.text} px-2 py-0.5 rounded-full border border-current/30`}>
                {badge.label}
              </span>
              {item?.lead?.source && (
                <span className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">
                  {item.lead.source}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1 truncate italic">
              {messagePreview}
            </p>
          </div>
        </div>
        
        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {/* Reply Button */}
          {onReplyReceived && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReplyReceived();
              }}
              className="p-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 border border-purple-500/30 transition-all hover:scale-105"
              title="Antwort erhalten"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
          
          {/* Edit Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (item?.type === 'new_lead') {
                setShowChiefEdit(true);
              } else if (onEdit) {
                onEdit();
              }
            }}
            className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 border border-slate-700 transition-all hover:scale-105"
            title="Bearbeiten"
          >
            <Edit className="w-4 h-4" />
          </button>
          
          {/* Copy Button */}
          {(currentMessage || item?.action?.message) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700 transition-all flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Kopieren</span>
            </button>
          )}
          
          {/* Instagram/Channel Button */}
          {(item?.lead?.instagram_url || contactLink) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenChannel();
              }}
              className="p-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 rounded-lg hover:from-purple-500/30 hover:to-pink-500/30 border border-pink-500/30 transition-all hover:scale-105"
              title="Instagram öffnen"
            >
              <Instagram className="w-4 h-4" />
            </button>
          )}
          
          {/* Snooze Button - nur für Follow-ups */}
          {item?.type === 'follow_up' && (
            <SnoozeDropdown
              followupId={item.id}
              onSnooze={onSnooze}
              disabled={isProcessing}
            />
          )}
          
          {/* Send Button */}
          {currentMessage || item?.action?.message ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onMarkAsSent) {
                  handleMarkAsSentClick();
                } else {
                  onSend();
                }
              }}
              disabled={isProcessing}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg shadow-lg shadow-cyan-500/20 font-medium transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Gesendet</span>
            </button>
          ) : item?.type === 'new_lead' && onComposeMessage ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComposeMessage();
              }}
              disabled={isProcessing}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg shadow-lg shadow-cyan-500/20 font-medium transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Kontaktieren</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Erfolgs-Badge */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm rounded-2xl z-10"
          >
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <span className="text-lg">✓</span>
              <span>Gesendet</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHIEF Edit Popup */}
      {currentMessage && (
        <ChiefEditPopup
          isOpen={showChiefEdit}
          onClose={() => setShowChiefEdit(false)}
          originalMessage={currentMessage}
          leadContext={{
            name: item?.lead?.name || 'Unbekannt',
            source: item?.lead?.source || 'Import',
            notes: item?.lead?.company || '',
          }}
          onMessageUpdated={(newMessage) => {
            setCurrentMessage(newMessage);
            if (onMessageUpdated) {
              onMessageUpdated(newMessage);
            }
            setShowChiefEdit(false);
          }}
        />
      )}
    </motion.div>
  );
};
