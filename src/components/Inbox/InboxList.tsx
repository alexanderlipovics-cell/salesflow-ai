/**
 * InboxList Component
 * 
 * Vertikale Liste aller Inbox Items, gruppiert nach Priorität
 */

import React, { useRef, useEffect } from 'react';
import { InboxItemComponent } from './InboxItem';
import type { InboxItem, GroupedInboxItems } from '@/types/inbox';

interface InboxListProps {
  grouped: GroupedInboxItems;
  onSend: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onSnooze: (itemId: string) => void;
  onArchive: (itemId: string) => void;
  onComposeMessage?: (itemId: string) => void;
  onMessageUpdated?: (itemId: string, newMessage: string) => void;
  onMarkAsSent?: (itemId: string) => void;
  onReplyReceived?: (item: InboxItem) => void; // "Hat geantwortet" Button
  processingId?: string | null;
  sentItemIds?: Set<string>; // Für Erfolgs-Animation
  autoAdvance?: boolean;
  focusedItemId?: string | null;
}

export const InboxList: React.FC<InboxListProps> = ({
  grouped,
  onSend,
  onEdit,
  onSnooze,
  onArchive,
  onComposeMessage,
  onMessageUpdated,
  onMarkAsSent,
  onReplyReceived,
  processingId = null,
  sentItemIds = new Set(),
  autoAdvance = false,
  focusedItemId = null,
}) => {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-Scroll zu fokussiertem Item
  useEffect(() => {
    if (focusedItemId && autoAdvance) {
      const element = itemRefs.current.get(focusedItemId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [focusedItemId, autoAdvance]);

  const renderGroup = (title: string, items: InboxItem[], badgeColor: string) => {
    // Sicherheitscheck: items muss ein Array sein
    if (!items || !Array.isArray(items) || items.length === 0) return null;

    return (
      <div key={title} className="mb-8">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 mb-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur-sm py-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeColor}`}>
            {title}
          </span>
          <span className="text-xs text-slate-500">({items.length})</span>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {items
            .filter((item) => item && item.id) // Filtere ungültige Items
            .map((item) => (
              <div
                key={item.id}
                ref={(el) => {
                  if (el && item?.id) itemRefs.current.set(item.id, el);
                }}
              >
                <InboxItemComponent
                  item={item}
                  onSend={() => onSend(item.id)}
                  onEdit={() => onEdit(item.id)}
                  onSnooze={(hours) => onSnooze(item.id, hours)}
                  onArchive={() => onArchive(item.id)}
                  onComposeMessage={onComposeMessage ? () => onComposeMessage(item.id) : undefined}
                  onMessageUpdated={onMessageUpdated ? (newMessage) => onMessageUpdated(item.id, newMessage) : undefined}
                  onMarkAsSent={onMarkAsSent ? () => onMarkAsSent(item.id) : undefined}
                  onReplyReceived={onReplyReceived ? () => onReplyReceived(item) : undefined}
                  isProcessing={processingId === item.id}
                  isSent={sentItemIds.has(item.id)}
                />
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Sicherheitscheck: grouped muss existieren und Arrays enthalten
  const hotItems = grouped?.hot || [];
  const todayItems = grouped?.today || [];
  const upcomingItems = grouped?.upcoming || [];
  
  const totalItems = (Array.isArray(hotItems) ? hotItems.length : 0) + 
                     (Array.isArray(todayItems) ? todayItems.length : 0) + 
                     (Array.isArray(upcomingItems) ? upcomingItems.length : 0);

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
          <span className="text-2xl">📬</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Inbox ist leer</h3>
        <p className="text-sm text-slate-400">
          Alle Action-Items sind erledigt. 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {renderGroup('🔥 Hot', hotItems, 'bg-red-500/20 text-red-400')}
      {renderGroup('📅 Heute', todayItems, 'bg-amber-500/20 text-amber-400')}
      {renderGroup('⏰ Demnächst', upcomingItems, 'bg-slate-500/20 text-slate-400')}
    </div>
  );
};

