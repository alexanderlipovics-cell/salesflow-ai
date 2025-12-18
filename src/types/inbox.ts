/**
 * Unified Inbox Types
 * 
 * Datenstruktur für die "Zero-Click" Sales Inbox, die alle Action-Items
 * (Leads, Follow-ups, Approvals) in einem Stream zusammenführt.
 */

export type InboxItemType = 'new_lead' | 'follow_up' | 'ai_approval' | 'reminder';
export type InboxPriority = 'hot' | 'today' | 'upcoming';
export type InboxActionType = 'send_message' | 'review_lead' | 'call' | 'custom';

export interface InboxItem {
  id: string;
  type: InboxItemType;
  priority: InboxPriority;
  lead: {
    id: string;
    name: string;
    avatar?: string;
    source: string; // Instagram, Facebook, WhatsApp, etc.
    company?: string;
    email?: string;
    phone?: string;
    // Zusätzliche Felder für Contact Links
    instagram_url?: string;
    instagram_username?: string;
    instagram?: string;
    facebook_url?: string;
    facebook_username?: string;
    linkedin_url?: string;
    linkedin?: string;
    source_url?: string;
  };
  action: {
    type: InboxActionType;
    message?: string | null; // KI-generierter Text (null triggers generation)
    confidence?: number; // 0-100, für Auto-Approve
    template?: string; // Template-Key für Queue-Items
    cta?: string; // Call-to-Action Text
    needsGeneration?: boolean; // Flag: Nachricht muss generiert werden
    queueId?: string; // Queue-ID für API-Call
  };
  metadata: {
    followUpNumber?: number; // Follow-up #1, #2, etc.
    dueDate: Date;
    createdAt: Date;
    templateKey?: string; // Für Follow-ups
    channel?: string; // WhatsApp, Instagram, etc.
  };
  autoSendStatus?: {
    canSend: boolean;
    reason: string; // 'first_contact', 'follow_up', 'wait_1_days', 'lead_replied_check_first', etc.
  };
}

/**
 * Gruppierte Inbox Items nach Priorität
 */
export interface GroupedInboxItems {
  hot: InboxItem[];
  today: InboxItem[];
  upcoming: InboxItem[];
}

/**
 * Magic Send All Result
 */
export interface MagicSendAllResult {
  sent: number;
  failed: number;
  skipped: number;
}

