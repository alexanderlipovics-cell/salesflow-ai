/**
 * InboxItem Component
 * 
 * Einzelne Zeile in der Inbox-Liste
 */

import React, { useState } from 'react';
import { Send, Edit, MoreVertical, Clock, Archive, Sparkles, MessageSquare, CheckCircle2, Check, Copy, Pencil, MessageCircle, Instagram, Facebook, Linkedin, Mail, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateContactLink } from '@/utils/contactLinks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InboxItem } from '@/types/inbox';
import { motion, AnimatePresence } from 'framer-motion';
import { ChiefEditPopup } from './ChiefEditPopup';

interface InboxItemProps {
  item: InboxItem;
  onSend: () => void;
  onEdit: () => void;
  onSnooze: () => void;
  onArchive: () => void;
  onComposeMessage?: () => void; // Für neue Leads
  onMessageUpdated?: (newMessage: string) => void; // Für CHIEF Edit
  onMarkAsSent?: () => void; // Als Gesendet markieren
  isProcessing?: boolean;
  isSent?: boolean; // Für Erfolgs-Animation
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
  isProcessing = false,
  isSent = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showChiefEdit, setShowChiefEdit] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(item?.action?.message || '');

  // Contact Link generieren
  const contactLink = item?.lead ? generateContactLink(item.lead) : null;

  // Icon mapping
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'MessageCircle': MessageCircle,
    'Instagram': Instagram,
    'Facebook': Facebook,
    'Linkedin': Linkedin,
    'Mail': Mail,
    'ExternalLink': ExternalLink,
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

  const getTypeBadge = () => {
    switch (item?.type) {
      case 'new_lead':
        return { label: 'Neu', color: 'bg-blue-500/20 text-blue-400' };
      case 'follow_up':
        return { label: `Follow-up #${item?.metadata?.followUpNumber || ''}`, color: 'bg-amber-500/20 text-amber-400' };
      case 'ai_approval':
        return { label: 'AI', color: 'bg-purple-500/20 text-purple-400' };
      case 'reminder':
        return { label: 'Erinnerung', color: 'bg-slate-500/20 text-slate-400' };
      default:
        return { label: 'Unbekannt', color: 'bg-slate-500/20 text-slate-400' };
    }
  };

  const getPriorityColor = () => {
    switch (item?.priority) {
      case 'hot':
        return 'border-l-red-500';
      case 'today':
        return 'border-l-amber-500';
      case 'upcoming':
        return 'border-l-slate-600';
      default:
        return 'border-l-slate-600';
    }
  };

  const typeBadge = getTypeBadge();
  const messagePreview = item?.action?.message
    ? item.action.message.substring(0, 80) + (item.action.message.length > 80 ? '...' : '')
    : item?.type === 'new_lead' ? 'Neuer Kontakt' : 'Keine Nachricht';
  
  // Status-Info für Auto-Send
  const autoSendStatus = item?.autoSendStatus;
  const getStatusBadge = () => {
    if (!autoSendStatus) return null;
    
    const { canSend, reason } = autoSendStatus;
    
    if (canSend) return null; // Kein Badge wenn erlaubt
    
    const statusMap: Record<string, { label: string; color: string; icon: string }> = {
      'wait_1_days': { label: 'Follow-up in 1 Tag', color: 'bg-slate-500/20 text-slate-400', icon: '⏰' },
      'wait_2_days': { label: 'Follow-up in 2 Tagen', color: 'bg-slate-500/20 text-slate-400', icon: '⏰' },
      'lead_replied_check_first': { label: 'Hat geantwortet', color: 'bg-purple-500/20 text-purple-400', icon: '📩' },
      'not_in_inbox': { label: 'Nicht in Inbox', color: 'bg-slate-500/20 text-slate-400', icon: '🚫' },
      'unknown_status': { label: 'Status unbekannt', color: 'bg-red-500/20 text-red-400', icon: '❓' },
    };
    
    return statusMap[reason] || { label: reason, color: 'bg-slate-500/20 text-slate-400', icon: '❓' };
  };
  
  const statusBadge = getStatusBadge();

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-item-id={item?.id || ''}
      className={`
        group relative flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4
        transition-all duration-200 hover:border-slate-700 hover:bg-slate-900 border-l-4 ${getPriorityColor()}
        ${showSuccess ? 'bg-emerald-500/10 border-emerald-500/50' : ''}
      `}
    >
      {/* Avatar + Name + Source */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          {item?.lead?.avatar ? (
            <img
              src={item.lead.avatar}
              alt={item?.lead?.name || 'Kontakt'}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
              {(item?.lead?.name?.charAt(0) || '?').toUpperCase()}
            </div>
          )}
          {item?.priority === 'hot' && (
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-slate-900" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-white truncate">{item?.lead?.name || 'Unbekannt'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadge.color}`}>
              {typeBadge.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {item?.lead?.source || 'Import'}
            </span>
            {statusBadge && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.color}`} title={statusBadge.label}>
                {statusBadge.icon} {statusBadge.label}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 truncate">{messagePreview}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Für Items mit Nachricht: Bearbeiten, Kopieren, Als Gesendet markieren */}
        {currentMessage || item?.action?.message ? (
          <div className="flex gap-2">
            {/* Bearbeiten - öffnet CHIEF Popup */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                console.log('Edit clicked for:', item?.id, item?.type);
                if (item?.type === 'new_lead') {
                  setShowChiefEdit(true);
                } else if (onEdit) {
                  onEdit();
                } else {
                  console.warn('onEdit not available for item:', item?.id);
                }
              }}
              className="text-slate-400 hover:text-white"
              title="Bearbeiten"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            
            {/* Kopieren - kopiert Nachricht in Zwischenablage */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              className="text-slate-300 hover:text-white"
              title="Kopieren"
            >
              <Copy className="h-4 w-4 mr-1" />
              Kopieren
            </Button>
            
            {/* Kontakt öffnen - Deep Link zu WhatsApp/Instagram/etc. */}
            {contactLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(contactLink.url, '_blank')}
                className="text-slate-300 hover:text-white gap-1"
                title={`${contactLink.label} öffnen`}
              >
                {React.createElement(iconMap[contactLink.icon] || ExternalLink, { className: 'h-4 w-4' })}
                {contactLink.label}
              </Button>
            )}
            
            {/* Als Gesendet markieren - aktualisiert Status */}
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleMarkAsSentClick}
              disabled={isProcessing}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              title="Als gesendet markieren"
            >
              <Check className="h-4 w-4 mr-1" />
              Gesendet
            </Button>
          </div>
        ) : item?.type === 'new_lead' ? (
          // Keine Nachricht: "Kontaktieren" Button
          <Button
            onClick={onComposeMessage}
            disabled={isProcessing}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
            size="sm"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Kontaktieren
          </Button>
        ) : (
          // Andere Items ohne Nachricht: Standard Actions
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('Edit clicked for:', item?.id, item?.type);
                if (onEdit) {
                  onEdit();
                } else {
                  console.warn('onEdit not available for item:', item?.id);
                }
              }}
              className="text-slate-400 hover:text-white"
              title="Bearbeiten"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border border-slate-700 bg-slate-800 text-slate-100"
              >
                <DropdownMenuItem onClick={onSnooze} className="cursor-pointer">
                  <Clock className="mr-2 h-4 w-4" />
                  Snooze
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive} className="cursor-pointer">
                  <Archive className="mr-2 h-4 w-4" />
                  Archivieren
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Erfolgs-Badge */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm rounded-lg z-10"
          >
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Check className="h-5 w-5" />
              <span>Gesendet</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHIEF Edit Popup - für alle Items mit Nachricht */}
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

