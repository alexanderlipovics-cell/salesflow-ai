/**
 * MagicSendModal Component
 * 
 * Modal zum Vorbereiten und Markieren mehrerer Nachrichten auf einmal
 */

import React, { useState } from 'react';
import { Sparkles, Copy, Check, MessageCircle, Instagram, Facebook, Linkedin, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateContactLink } from '@/utils/contactLinks';

// Simple Checkbox Component
const Checkbox = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
  />
);

// Simple Badge Component
const Badge = ({ children, variant, className }: { children: React.ReactNode; variant?: 'outline'; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variant === 'outline' ? 'border border-slate-600 bg-slate-800 text-slate-300' : 'bg-slate-700 text-slate-300'} ${className || ''}`}>
    {children}
  </span>
);
// Simple Dialog Component (wie in ChiefEditPopup)
const Dialog = ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-6 w-full max-w-2xl ${className || ''}`}>
    {children}
  </div>
);

const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 pb-4 border-b border-slate-700">
    {children}
  </div>
);

const DialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`text-xl font-semibold text-white ${className || ''}`}>
    {children}
  </h2>
);

const DialogFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-700 ${className}`}>
    {children}
  </div>
);
import type { InboxItem } from '@/types/inbox';
import toast from 'react-hot-toast';

interface MagicSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InboxItem[];
  onMarkAllSent: (itemIds: string[]) => void;
}

export const MagicSendModal: React.FC<MagicSendModalProps> = ({
  isOpen,
  onClose,
  items,
  onMarkAllSent,
}) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Icon mapping
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'MessageCircle': MessageCircle,
    'Instagram': Instagram,
    'Facebook': Facebook,
    'Linkedin': Linkedin,
    'Mail': Mail,
    'ExternalLink': ExternalLink,
  };

  const handleCopyOne = async (item: InboxItem) => {
    const message = item.action.message || '';
    if (!message) {
      toast.error('Keine Nachricht zum Kopieren');
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopiedItems(prev => new Set([...prev, item.id]));
      toast.success(`Nachricht für ${item.lead.name} kopiert`);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
      toast.error('Fehler beim Kopieren');
    }
  };

  const handleCopyAll = async () => {
    // Kopiert alle als formatierte Liste
    const allMessages = items
      .filter(item => item.action.message)
      .map(item => 
        `--- ${item.lead.name} (${item.lead.source}) ---\n${item.action.message}\n`
      )
      .join('\n');
    
    if (!allMessages) {
      toast.error('Keine Nachrichten zum Kopieren');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(allMessages);
      toast.success(`${items.length} Nachrichten kopiert`);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
      toast.error('Fehler beim Kopieren');
    }
  };

  const handleMarkSelectedAsSent = async () => {
    const selectedIds = Array.from(checkedItems);
    if (selectedIds.length === 0) {
      toast.error('Bitte wähle mindestens ein Item aus');
      return;
    }

    setIsProcessing(true);
    try {
      // API Base URL
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
        : (import.meta.env.PROD ? 'https://salesflow-ai.onrender.com' : 'http://localhost:8000');

      // Token holen
      const { authService } = await import('@/services/authService');
      let token = authService.getAccessToken();
      if (!token) {
        token = localStorage.getItem('access_token');
      }
      if (!token) {
        throw new Error('Nicht authentifiziert');
      }

      // API Call
      const response = await fetch(`${API_BASE_URL}/api/inbox-unified/bulk-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_ids: selectedIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(errorData.detail || errorData.error || 'Fehler beim Markieren');
      }

      onMarkAllSent(selectedIds);
      toast.success(`${selectedIds.length} als gesendet markiert`);
      setCheckedItems(new Set());
      onClose();
    } catch (err) {
      console.error('Fehler beim Markieren:', err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Markieren');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectAll = () => {
    setCheckedItems(new Set(items.map(i => i.id)));
  };

  const handleToggleItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setCheckedItems(prev => new Set([...prev, itemId]));
    } else {
      setCheckedItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            {items.length} Nachrichten vorbereitet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {items.map(item => (
            <div 
              key={item.id}
              className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700"
            >
              {/* Checkbox */}
              <Checkbox
                checked={checkedItems.has(item.id)}
                onCheckedChange={(checked) => handleToggleItem(item.id, checked as boolean)}
              />

              {/* Lead Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-white">{item.lead.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {item.lead.source}
                  </Badge>
                  {copiedItems.has(item.id) && (
                    <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/50">
                      Kopiert ✓
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-400 truncate">
                  {item.action.message || 'Keine Nachricht'}
                </p>
              </div>

              {/* Copy Button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleCopyOne(item)}
                className="text-slate-400 hover:text-white"
                title="Kopieren"
              >
                <Copy className="h-4 w-4" />
              </Button>

              {/* Contact Link Button */}
              {(() => {
                const contactLink = generateContactLink(item.lead);
                return contactLink ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(contactLink.url, '_blank')}
                    className="text-slate-400 hover:text-white"
                    title={`${contactLink.label} öffnen`}
                  >
                    {React.createElement(iconMap[contactLink.icon] || ExternalLink, { className: 'h-4 w-4' })}
                  </Button>
                ) : null;
              })()}
            </div>
          ))}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCopyAll}>
            <Copy className="h-4 w-4 mr-2" />
            Alle kopieren
          </Button>
          
          <Button variant="outline" onClick={handleSelectAll}>
            Alle auswählen
          </Button>
          
          <Button 
            onClick={handleMarkSelectedAsSent}
            disabled={checkedItems.size === 0 || isProcessing}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            {checkedItems.size} als Gesendet markieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MagicSendModal;

