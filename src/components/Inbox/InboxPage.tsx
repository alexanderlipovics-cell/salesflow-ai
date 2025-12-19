/**
 * InboxPage Component
 * 
 * Hauptseite für die Unified Inbox
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Loader2, RefreshCw, Keyboard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InboxList } from './InboxList';
import { MagicSendAll } from './MagicSendAll';
import { ReviewMode } from './ReviewMode';
import { MagicSendModal } from './MagicSendModal';
import { ChiefEditPopup } from './ChiefEditPopup';
import { ReplyModal } from './ReplyModal';
import ReviewOverlay from './ReviewOverlay';
import { useInbox } from '@/hooks/useInbox';
import type { MagicSendAllResult, InboxItem, GroupedInboxItems, ProcessReplyResponse } from '@/types/inbox';

// Helper: Gruppiert Items nach Priorität
// Sicherheitscheck: Verhindert Crash wenn items undefined/null ist
const groupByPriority = (items: InboxItem[]): GroupedInboxItems => {
  // Sicherheitscheck: items muss ein Array sein
  if (!items || !Array.isArray(items)) {
    return { hot: [], today: [], upcoming: [] };
  }
  
  return {
    hot: items.filter((item) => item?.priority === 'hot'),
    today: items.filter((item) => item?.priority === 'today'),
    upcoming: items.filter((item) => item?.priority === 'upcoming'),
  };
};

export const InboxPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    grouped,
    loading,
    error,
    refetch,
    sendItem,
    skipItem,
    archiveItem,
    snoozeItem,
  } = useInbox();

  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [sentItemIds, setSentItemIds] = useState<Set<string>>(new Set());
  const [showMagicSendModal, setShowMagicSendModal] = useState(false);
  
  // Review Overlay State (für inbox_drafts)
  const [showReviewOverlay, setShowReviewOverlay] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState<Array<{
    id: string;
    contact_name: string;
    platform: 'whatsapp' | 'instagram' | 'linkedin' | 'email';
    draft_content: string;
    original_message?: string;
    contact_identifier?: string;
  }>>([]);
  
  // Magic Send All Handler
  const handleMagicSendAll = useCallback(
    async (itemIds: string[]): Promise<MagicSendAllResult> => {
      // API Base URL - OHNE /api, da Endpunkt bereits /api/inbox-unified hat
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
        : (import.meta.env.PROD ? 'https://salesflow-ai.onrender.com' : 'http://localhost:8000');

      // Token holen - mehrere Quellen prüfen
      const { authService } = await import('@/services/authService');
      let token = authService.getAccessToken();
      if (!token) {
        token = localStorage.getItem('access_token');
      }
      if (!token) {
        const { supabaseClient } = await import('@/lib/supabaseClient');
        const { data: { session } } = await supabaseClient.auth.getSession();
        token = session?.access_token || null;
      }

      if (!token) {
        throw new Error('Nicht authentifiziert. Bitte melde dich erneut an.');
      }

      try {
        const url = `${API_BASE_URL}/api/inbox-unified/bulk-send`;
        
        console.log('InboxPage.handleMagicSendAll: Sending POST to:', url);
        console.log('InboxPage.handleMagicSendAll: Token exists:', !!token);
        console.log('InboxPage.handleMagicSendAll: Item IDs:', itemIds);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            item_ids: itemIds,
          }),
        });

        console.log('InboxPage.handleMagicSendAll: Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
          console.error('InboxPage.handleMagicSendAll: Error response:', errorData);
          throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: Bulk-Send fehlgeschlagen`);
        }

        const result = await response.json();
        await refetch();
        return result;
      } catch (err) {
        console.error('Fehler beim Bulk-Send:', err);
        throw err;
      }
    },
    [refetch]
  );

  // Item Actions mit Auto-Advance
  const handleSend = useCallback(
    async (itemId: string) => {
      setProcessingId(itemId);
      try {
        await sendItem(itemId);
        
        // Erfolgs-Animation
        setSentItemIds((prev) => new Set(prev).add(itemId));
        
        // Item nach kurzer Verzögerung entfernen (nach Animation)
        setTimeout(() => {
          setSentItemIds((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        }, 2000);
        
        // Auto-Advance zum nächsten Item
        if (items && Array.isArray(items)) {
          const currentIndex = items.findIndex((item) => item?.id === itemId);
          if (currentIndex >= 0 && currentIndex < items.length - 1) {
            const nextItem = items[currentIndex + 1];
            if (nextItem?.id) {
              setFocusedItemId(nextItem.id);
              // Scroll nach kurzer Verzögerung
              setTimeout(() => {
                const element = document.querySelector(`[data-item-id="${nextItem.id}"]`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 300);
            }
          }
        }
      } catch (err) {
        console.error('Fehler beim Senden:', err);
        alert('Fehler beim Senden. Bitte versuche es erneut.');
      } finally {
        setProcessingId(null);
      }
    },
    [sendItem, items]
  );

  const handleSkip = useCallback(
    async (itemId: string) => {
      setProcessingId(itemId);
      try {
        await skipItem(itemId);
        // Auto-Advance
        if (items && Array.isArray(items)) {
          const currentIndex = items.findIndex((item) => item?.id === itemId);
          if (currentIndex >= 0 && currentIndex < items.length - 1) {
            const nextItem = items[currentIndex + 1];
            if (nextItem?.id) {
              setFocusedItemId(nextItem.id);
            }
          }
        }
      } catch (err) {
        console.error('Fehler beim Überspringen:', err);
      } finally {
        setProcessingId(null);
      }
    },
    [skipItem, items]
  );

  const [editingItem, setEditingItem] = useState<InboxItem | null>(null);
  const [showChiefEdit, setShowChiefEdit] = useState(false);
  // Lokaler State für bearbeitete Nachrichten (überschreibt Items aus useInbox)
  const [editedMessages, setEditedMessages] = useState<Map<string, string>>(new Map());
  // Reply Modal State
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedLeadForReply, setSelectedLeadForReply] = useState<{
    id: string;
    name: string;
    state: string;
    contact?: {
      instagram_url?: string;
      whatsapp?: string;
      email?: string;
      phone?: string;
    };
  } | null>(null);

  const handleMessageUpdated = useCallback(
    (itemId: string, newMessage: string) => {
      console.log('Message updated for item:', itemId, 'new message:', newMessage);
      
      // Speichere die bearbeitete Nachricht im lokalen State
      // Diese überschreibt die Nachricht im Item beim Rendern
      setEditedMessages((prev) => {
        const next = new Map(prev);
        next.set(itemId, newMessage);
        return next;
      });
    },
    []
  );

  const handleEdit = useCallback(async (itemId: string) => {
    // Sicherheitscheck: items muss ein Array sein
    if (!items || !Array.isArray(items)) {
      console.warn('handleEdit: items is not an array');
      return;
    }
    
    // Suche Item in items oder in bearbeiteten Items
    let item = items.find((i) => i?.id === itemId);
    
    if (!item) {
      console.warn('Item nicht gefunden:', itemId);
      return;
    }
    
    // Wenn Item eine bearbeitete Nachricht hat, verwende diese
    const editedMessage = editedMessages.get(itemId);
    if (editedMessage) {
      item = {
        ...item,
        action: {
          ...(item.action || {}),
          message: editedMessage,
        },
      };
    }
    
    // Prüfe ob Nachricht generiert werden muss
    if (item.action?.needsGeneration && item.action?.queueId) {
      try {
        setProcessingId(itemId);
        
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
          const { supabaseClient } = await import('@/lib/supabaseClient');
          const { data: { session } } = await supabaseClient.auth.getSession();
          token = session?.access_token || null;
        }

        if (!token) {
          throw new Error('Nicht authentifiziert');
        }

        // Generiere Nachricht via API
        const response = await fetch(`${API_BASE_URL}/api/chief/generate-queue-message`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ queue_id: item.action.queueId }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
          throw new Error(errorData.detail || errorData.error || 'Fehler beim Generieren');
        }
        
        const data = await response.json();
        
        // Update item mit generierter Nachricht
        const updatedItem = {
          ...item,
          action: {
            ...item.action,
            message: data.message,
            needsGeneration: false,
          },
        };
        
        // Speichere die generierte Nachricht im lokalen State
        handleMessageUpdated(itemId, data.message);
        
        // Öffne Edit-Popup mit generierter Nachricht
        setEditingItem(updatedItem);
        setShowChiefEdit(true);
        
      } catch (err) {
        console.error('Fehler beim Generieren der Nachricht:', err);
        alert('Fehler beim Generieren der Nachricht. Bitte versuche es erneut.');
      } finally {
        setProcessingId(null);
      }
    } else if (item.action?.message) {
      // Item hat bereits eine Nachricht - öffne Edit-Popup
      setEditingItem(item);
      setShowChiefEdit(true);
    } else {
      console.log('Edit item:', itemId, 'keine Nachricht vorhanden');
    }
  }, [items, editedMessages, handleMessageUpdated]);

  const handleSnooze = useCallback(
    async (itemId: string, hours: number) => {
      try {
        await snoozeItem(itemId, hours);
      } catch (error) {
        console.error('Snooze error:', error);
        // Error wird bereits in snoozeItem behandelt
      }
    },
    [snoozeItem]
  );

  const handleArchive = useCallback(
    async (itemId: string) => {
      await archiveItem(itemId);
    },
    [archiveItem]
  );

  const handleComposeMessage = useCallback(
    (itemId: string) => {
      if (!items || !Array.isArray(items)) {
        console.warn('handleComposeMessage: items is not an array');
        return;
      }
      
      const item = items.find((i) => i?.id === itemId);
      if (!item || !item.lead?.id) return;

      // Für neue Leads: Navigiere zur Chat-Seite mit Lead-ID
      const leadId = item.lead.id;
      navigate(`/chat?leadId=${leadId}`);
    },
    [items, navigate]
  );

  // Handler für "Hat geantwortet" Button
  const handleReplyReceived = useCallback((item: InboxItem) => {
    // Debug: Zeige was im item steckt
    console.log('Item for reply:', item);
    console.log('Lead data:', item.lead);
    
    // Extrahiere Kontaktdaten aus item ODER item.lead
    const lead = item.lead || {};
    
    // Instagram: Prüfe alle möglichen Felder (wie in useInbox.ts)
    const instagramUrl = 
      lead.instagram_url || 
      lead.source_url || 
      (lead.instagram_username ? `https://instagram.com/${lead.instagram_username.replace('@', '')}` : null) ||
      (lead.instagram ? `https://instagram.com/${lead.instagram.replace('@', '')}` : null) ||
      (item as any).instagram_url ||
      (item as any).source_url;
    
    // Phone: Prüfe alle möglichen Felder
    const phone = 
      lead.phone || 
      (lead as any).whatsapp || 
      (item as any).phone ||
      (item as any).whatsapp;
    
    // Email: Prüfe alle möglichen Felder
    const email = 
      lead.email || 
      (item as any).email;
    
    setSelectedLeadForReply({
      id: lead.id || item.id,
      name: lead.name || 'Unbekannt',
      state: 'new', // TODO: Get actual state from item metadata if available
      contact: {
        instagram_url: instagramUrl || undefined,
        phone: phone || undefined,
        email: email || undefined,
        whatsapp: phone || undefined, // WhatsApp nutzt Phone
      }
    });
    
    console.log('Selected lead for reply:', {
      id: lead.id || item.id,
      name: lead.name || 'Unbekannt',
      contact: {
        instagram_url: instagramUrl,
        phone: phone,
        email: email,
        whatsapp: phone,
      }
    });
    
    setReplyModalOpen(true);
  }, []);

  // Load pending drafts for Review Overlay
  const loadPendingDrafts = useCallback(async () => {
    console.log('🔍 Loading pending drafts...');
    
    try {
      const { supabaseClient } = await import('@/lib/supabaseClient');
      console.log('✅ Supabase client loaded');
      
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError) {
        console.error('❌ Error getting user:', userError);
        return;
      }
      
      if (!user) {
        console.log('⚠️ No user found, skipping draft load');
        setPendingDrafts([]);
        return;
      }
      
      console.log('👤 User ID:', user.id);
      
      const { data, error } = await supabaseClient
        .from('inbox_drafts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      console.log('📦 Drafts query result:', { data, error, count: data?.length || 0 });
      
      if (error) {
        console.error('❌ Error loading drafts:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setPendingDrafts([]);
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} pending drafts:`, data.map(d => ({ id: d.id, contact: d.contact_name, platform: d.platform })));
        setPendingDrafts(data);
      } else {
        console.log('⚠️ No pending drafts found');
        setPendingDrafts([]);
      }
    } catch (err) {
      console.error('💥 Exception loading drafts:', err);
      setPendingDrafts([]);
    }
  }, []);

  // Load drafts on mount and when user changes
  React.useEffect(() => {
    console.log('🚀 InboxPage mounted, loading drafts...');
    loadPendingDrafts();
  }, [loadPendingDrafts]);
  
  // Also reload drafts when items change (after refetch)
  React.useEffect(() => {
    if (items && items.length >= 0) {
      // Reload drafts when inbox is refreshed
      loadPendingDrafts();
    }
  }, [items?.length, loadPendingDrafts]); // Trigger when item count changes

  // Review Overlay Handlers
  const handleReviewSend = useCallback(async (id: string, content: string) => {
    try {
      const { supabaseClient } = await import('@/lib/supabaseClient');
      const { error } = await supabaseClient
        .from('inbox_drafts')
        .update({ 
          status: 'sent', 
          draft_content: content, 
          sent_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) {
        console.error('Error updating draft:', error);
        throw error;
      }
      
      // Remove from local state
      setPendingDrafts(prev => prev.filter((d: any) => d.id !== id));
    } catch (err) {
      console.error('Failed to mark draft as sent:', err);
      throw err;
    }
  }, []);

  const handleDraftSkip = useCallback(async (id: string) => {
    try {
      const { supabaseClient } = await import('@/lib/supabaseClient');
      const { error } = await supabaseClient
        .from('inbox_drafts')
        .update({ status: 'skipped' })
        .eq('id', id);
      
      if (error) {
        console.error('Error skipping draft:', error);
        throw error;
      }
      
      // Remove from local state
      setPendingDrafts(prev => prev.filter((d: any) => d.id !== id));
    } catch (err) {
      console.error('Failed to skip draft:', err);
      throw err;
    }
  }, []);

  // Handler wenn Reply verarbeitet wurde
  const handleReplyProcessed = useCallback((response: ProcessReplyResponse) => {
    // Optional: Item aus Liste entfernen oder updaten
    console.log('Reply processed:', response);
    
    // Inbox neu laden
    refetch();
  }, [refetch]);

  // Mark as Sent Handler
  const handleMarkAsSent = useCallback(
    async (itemId: string) => {
      setProcessingId(itemId);
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
        const response = await fetch(`${API_BASE_URL}/api/inbox-unified/${itemId}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
          throw new Error(errorData.detail || errorData.error || 'Fehler beim Markieren');
        }

        // Item aus Liste entfernen
        await refetch();
      } catch (err) {
        console.error('Fehler beim Markieren als gesendet:', err);
        throw err;
      } finally {
        setProcessingId(null);
      }
    },
    [refetch]
  );

  // Alle Items die eine Nachricht haben
  const sendableItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(item => item?.action?.message);
  }, [items]);

  // Mark All Sent Handler für Modal
  const handleMarkAllSent = useCallback(
    (itemIds: string[]) => {
      // Items aus Liste entfernen (wird durch refetch aktualisiert)
      refetch();
    },
    [refetch]
  );

  // Review Mode Handlers
  const handleReviewApprove = useCallback(
    async (itemId: string) => {
      setProcessingId(itemId);
      try {
        await sendItem(itemId);
        // Nächstes Item
        const itemsLength = items && Array.isArray(items) ? items.length : 0;
        if (reviewIndex < itemsLength - 1) {
          setReviewIndex(reviewIndex + 1);
        } else {
          setReviewMode(false);
        }
      } catch (err) {
        console.error('Fehler beim Approve:', err);
      } finally {
        setProcessingId(null);
      }
    },
    [sendItem, items, reviewIndex]
  );

  const handleReviewSkip = useCallback(
    async (itemId: string) => {
      setProcessingId(itemId);
      try {
        await skipItem(itemId);
        // Nächstes Item
        const itemsLength = items && Array.isArray(items) ? items.length : 0;
        if (reviewIndex < itemsLength - 1) {
          setReviewIndex(reviewIndex + 1);
        } else {
          setReviewMode(false);
        }
      } catch (err) {
        console.error('Fehler beim Skip:', err);
      } finally {
        setProcessingId(null);
      }
    },
    [skipItem, items, reviewIndex]
  );

  const handleReviewPrevious = useCallback(() => {
    if (reviewIndex > 0) {
      setReviewIndex(reviewIndex - 1);
    }
  }, [reviewIndex]);

  const handleReviewNext = useCallback(() => {
    const itemsLength = items && Array.isArray(items) ? items.length : 0;
    if (reviewIndex < itemsLength - 1) {
      setReviewIndex(reviewIndex + 1);
    }
  }, [reviewIndex, items]);

  // Keyboard Shortcut für Review Mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const itemsLength = items && Array.isArray(items) ? items.length : 0;
          if (!reviewMode && itemsLength > 0) {
            setReviewMode(true);
            setReviewIndex(0);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviewMode, items]);

  // Grouped items with edited messages
  const groupedItems = useMemo(() => {
    try {
      if (!items || !Array.isArray(items)) {
        return { hot: [], today: [], upcoming: [] };
      }
      
      if (!editedMessages || !(editedMessages instanceof Map)) {
        return groupByPriority(items);
      }
      
      const itemsWithEdits = items.map((item) => {
        if (!item || !item.id) return null;
        
        try {
          const editedMessage = editedMessages.get(item.id);
          if (editedMessage) {
            return {
              ...item,
              action: {
                ...(item.action || {}),
                message: editedMessage,
              },
            };
          }
          return item;
        } catch (itemError) {
          console.warn('Error processing item in useMemo:', itemError);
          return item;
        }
      }).filter((item): item is InboxItem => item !== null && item !== undefined);
      
      return groupByPriority(itemsWithEdits);
    } catch (error) {
      console.error('Error in grouped useMemo, using fallback:', error);
      return { hot: [], today: [], upcoming: [] };
    }
  }, [items, editedMessages]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <span className="ml-3 text-slate-400">Lade Inbox...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={refetch}>Erneut versuchen</Button>
        </div>
      </div>
    );
  }

  // Review Mode Overlay
  if (reviewMode) {
    return (
      <ReviewMode
        items={items && Array.isArray(items) ? items : []}
        currentIndex={reviewIndex}
        onClose={() => setReviewMode(false)}
        onApprove={handleReviewApprove}
        onSkip={handleReviewSkip}
        onEdit={handleEdit}
        onPrevious={handleReviewPrevious}
        onNext={handleReviewNext}
        isProcessing={processingId !== null}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
            <Inbox className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-sm text-slate-400">
              Alle Action-Items an einem Ort
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MagicSendAll items={items && Array.isArray(items) ? items : []} onSendAll={handleMagicSendAll} />

          <Button
            onClick={() => setShowMagicSendModal(true)}
            disabled={!sendableItems || sendableItems.length === 0}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Alle vorbereiten ({sendableItems?.length || 0})
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setReviewMode(true);
              setReviewIndex(0);
            }}
            disabled={!items || !Array.isArray(items) || items.length === 0}
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Review Mode
          </Button>

          {/* Review Overlay Button für inbox_drafts */}
          <Button
            variant="default"
            onClick={() => {
              console.log('📝 Opening Review Overlay with drafts:', pendingDrafts.length);
              setShowReviewOverlay(true);
            }}
            disabled={pendingDrafts.length === 0}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Review Mode ({pendingDrafts.length})
          </Button>

          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Inbox List - mit bearbeiteten Nachrichten */}
      <InboxList
        grouped={groupedItems}
        onSend={handleSend}
        onEdit={handleEdit}
        onSnooze={(id) => handleSnooze(id, 24)}
        onArchive={handleArchive}
        onComposeMessage={handleComposeMessage}
        onMessageUpdated={handleMessageUpdated}
        onMarkAsSent={handleMarkAsSent}
        onReplyReceived={handleReplyReceived}
        processingId={processingId}
        sentItemIds={sentItemIds}
        autoAdvance={true}
        focusedItemId={focusedItemId}
      />

      {/* Magic Send Modal */}
      <MagicSendModal
        isOpen={showMagicSendModal}
        onClose={() => setShowMagicSendModal(false)}
        items={sendableItems || []}
        onMarkAllSent={handleMarkAllSent}
      />

      {/* CHIEF Edit Popup */}
      {editingItem && editingItem.action?.message && (
        <ChiefEditPopup
          isOpen={showChiefEdit}
          onClose={() => {
            setShowChiefEdit(false);
            setEditingItem(null);
          }}
          originalMessage={editingItem.action?.message || ''}
          leadContext={{
            name: editingItem.lead?.name || 'Unbekannt',
            source: editingItem.lead?.source || 'Import',
            notes: editingItem.lead?.company || '',
          }}
          onMessageUpdated={(newMessage) => {
            // Update die Nachricht im Item
            console.log('ChiefEditPopup: onMessageUpdated called with:', newMessage);
            if (editingItem) {
              handleMessageUpdated(editingItem.id, newMessage);
            }
            setShowChiefEdit(false);
            setEditingItem(null);
            // Kein Refetch nötig - State wird direkt aktualisiert
          }}
        />
      )}

      {/* Reply Modal */}
      {selectedLeadForReply && (
        <ReplyModal
          isOpen={replyModalOpen}
          onClose={() => {
            setReplyModalOpen(false);
            setSelectedLeadForReply(null);
          }}
          leadId={selectedLeadForReply.id}
          leadName={selectedLeadForReply.name}
          currentState={selectedLeadForReply.state}
          onReplyProcessed={handleReplyProcessed}
          leadContact={selectedLeadForReply.contact}
        />
      )}

      {/* Review Overlay für inbox_drafts */}
      <ReviewOverlay
        isOpen={showReviewOverlay}
        onClose={() => {
          setShowReviewOverlay(false);
          loadPendingDrafts(); // Refresh nach Close
        }}
        drafts={pendingDrafts}
        onSend={handleReviewSend}
        onSkip={handleDraftSkip}
      />
    </div>
  );
};

export default InboxPage;

