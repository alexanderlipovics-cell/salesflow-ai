// ============================================
// 🗄️ SALESFLOW AI - ZUSTAND STORES
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Lead, LeadStatus, LeadPriority, Notification, ChatMessage } from '../types';

// ==================== UI STORE ====================

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Modals
  activeModal: string | null;
  modalData: Record<string, unknown> | null;

  // Bottom Sheet (Mobile)
  bottomSheetOpen: boolean;
  bottomSheetContent: string | null;

  // Toast Notifications
  toasts: Toast[];

  // Theme
  theme: 'light' | 'dark' | 'system';

  // Actions
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  openModal: (id: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  openBottomSheet: (content: string) => void;
  closeBottomSheet: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial State
      sidebarOpen: true,
      sidebarCollapsed: false,
      activeModal: null,
      modalData: null,
      bottomSheetOpen: false,
      bottomSheetContent: null,
      toasts: [],
      theme: 'system',

      // Actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      collapseSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      openModal: (id, data) => set({ activeModal: id, modalData: data || null }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      openBottomSheet: (content) => set({ bottomSheetOpen: true, bottomSheetContent: content }),
      closeBottomSheet: () => set({ bottomSheetOpen: false, bottomSheetContent: null }),

      addToast: (toast) =>
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
        })),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'salesflow-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);

// ==================== LEAD FILTER STORE ====================

interface LeadFilterState {
  // Filters
  statusFilter: LeadStatus | 'all';
  priorityFilter: LeadPriority | 'all';
  sourceFilter: string | 'all';
  searchQuery: string;
  dateRange: { start: Date | null; end: Date | null };
  assignedToFilter: string | 'all';

  // Sorting
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // View
  viewMode: 'list' | 'grid' | 'kanban';

  // Selection
  selectedLeadIds: string[];

  // Actions
  setStatusFilter: (status: LeadStatus | 'all') => void;
  setPriorityFilter: (priority: LeadPriority | 'all') => void;
  setSourceFilter: (source: string | 'all') => void;
  setSearchQuery: (query: string) => void;
  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
  setAssignedToFilter: (userId: string | 'all') => void;
  setSortBy: (field: string) => void;
  toggleSortOrder: () => void;
  setViewMode: (mode: 'list' | 'grid' | 'kanban') => void;
  selectLead: (id: string) => void;
  deselectLead: (id: string) => void;
  selectAllLeads: (ids: string[]) => void;
  clearSelection: () => void;
  resetFilters: () => void;
}

const initialFilterState = {
  statusFilter: 'all' as const,
  priorityFilter: 'all' as const,
  sourceFilter: 'all' as const,
  searchQuery: '',
  dateRange: { start: null, end: null },
  assignedToFilter: 'all' as const,
  sortBy: 'createdAt',
  sortOrder: 'desc' as const,
  viewMode: 'list' as const,
  selectedLeadIds: [],
};

export const useLeadFilterStore = create<LeadFilterState>()((set) => ({
  ...initialFilterState,

  setStatusFilter: (status) => set({ statusFilter: status }),
  setPriorityFilter: (priority) => set({ priorityFilter: priority }),
  setSourceFilter: (source) => set({ sourceFilter: source }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDateRange: (range) => set({ dateRange: range }),
  setAssignedToFilter: (userId) => set({ assignedToFilter: userId }),
  setSortBy: (field) => set({ sortBy: field }),
  toggleSortOrder: () => set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' })),
  setViewMode: (mode) => set({ viewMode: mode }),
  selectLead: (id) => set((state) => ({ selectedLeadIds: [...state.selectedLeadIds, id] })),
  deselectLead: (id) => set((state) => ({ selectedLeadIds: state.selectedLeadIds.filter((i) => i !== id) })),
  selectAllLeads: (ids) => set({ selectedLeadIds: ids }),
  clearSelection: () => set({ selectedLeadIds: [] }),
  resetFilters: () => set(initialFilterState),
}));

// ==================== CHAT STORE ====================

interface ChatState {
  // Current Conversation
  activeConversationId: string | null;
  messages: ChatMessage[];
  isTyping: boolean;

  // Context
  contextLeadId: string | null;
  contextLead: Lead | null;

  // Input
  inputMessage: string;
  attachments: File[];
  isRecording: boolean;

  // Quick Actions
  showQuickActions: boolean;

  // Actions
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setIsTyping: (isTyping: boolean) => void;
  setContextLead: (leadId: string | null, lead?: Lead | null) => void;
  setInputMessage: (message: string) => void;
  addAttachment: (file: File) => void;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
  setIsRecording: (isRecording: boolean) => void;
  toggleQuickActions: () => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  // Initial State
  activeConversationId: null,
  messages: [],
  isTyping: false,
  contextLeadId: null,
  contextLead: null,
  inputMessage: '',
  attachments: [],
  isRecording: false,
  showQuickActions: false,

  // Actions
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setIsTyping: (isTyping) => set({ isTyping }),
  setContextLead: (leadId, lead) => set({ contextLeadId: leadId, contextLead: lead || null }),
  setInputMessage: (message) => set({ inputMessage: message }),
  addAttachment: (file) => set((state) => ({ attachments: [...state.attachments, file] })),
  removeAttachment: (index) => set((state) => ({ attachments: state.attachments.filter((_, i) => i !== index) })),
  clearAttachments: () => set({ attachments: [] }),
  setIsRecording: (isRecording) => set({ isRecording }),
  toggleQuickActions: () => set((state) => ({ showQuickActions: !state.showQuickActions })),
  clearChat: () => set({ messages: [], inputMessage: '', attachments: [], activeConversationId: null }),
}));

// ==================== FOLLOW-UP STORE ====================

interface FollowUpBuilderState {
  // Current Sequence
  currentSequenceId: string | null;
  steps: FollowUpBuilderStep[];
  isDirty: boolean;

  // Drag & Drop
  draggedStepId: string | null;
  dropTargetIndex: number | null;

  // Template Selection
  showTemplateLibrary: boolean;
  selectedTemplateId: string | null;

  // Actions
  setCurrentSequence: (id: string | null) => void;
  addStep: (step: FollowUpBuilderStep) => void;
  updateStep: (id: string, updates: Partial<FollowUpBuilderStep>) => void;
  removeStep: (id: string) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;
  setDraggedStep: (id: string | null) => void;
  setDropTarget: (index: number | null) => void;
  toggleTemplateLibrary: () => void;
  selectTemplate: (id: string | null) => void;
  clearBuilder: () => void;
  markClean: () => void;
}

interface FollowUpBuilderStep {
  id: string;
  type: 'email' | 'sms' | 'call' | 'whatsapp' | 'linkedin';
  delayDays: number;
  delayHours: number;
  templateId?: string;
  subject?: string;
  content: string;
}

export const useFollowUpBuilderStore = create<FollowUpBuilderState>()((set) => ({
  // Initial State
  currentSequenceId: null,
  steps: [],
  isDirty: false,
  draggedStepId: null,
  dropTargetIndex: null,
  showTemplateLibrary: false,
  selectedTemplateId: null,

  // Actions
  setCurrentSequence: (id) => set({ currentSequenceId: id }),

  addStep: (step) =>
    set((state) => ({
      steps: [...state.steps, step],
      isDirty: true,
    })),

  updateStep: (id, updates) =>
    set((state) => ({
      steps: state.steps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      isDirty: true,
    })),

  removeStep: (id) =>
    set((state) => ({
      steps: state.steps.filter((s) => s.id !== id),
      isDirty: true,
    })),

  reorderSteps: (fromIndex, toIndex) =>
    set((state) => {
      const newSteps = [...state.steps];
      const [removed] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, removed);
      return { steps: newSteps, isDirty: true };
    }),

  setDraggedStep: (id) => set({ draggedStepId: id }),
  setDropTarget: (index) => set({ dropTargetIndex: index }),
  toggleTemplateLibrary: () => set((state) => ({ showTemplateLibrary: !state.showTemplateLibrary })),
  selectTemplate: (id) => set({ selectedTemplateId: id }),
  clearBuilder: () => set({ currentSequenceId: null, steps: [], isDirty: false }),
  markClean: () => set({ isDirty: false }),
}));

// ==================== NOTIFICATION STORE ====================

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isDrawerOpen: boolean;

  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  toggleDrawer: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  isDrawerOpen: false,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true, readAt: new Date() })),
      unreadCount: 0,
    })),

  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
}));

// ==================== OFFLINE STORE ====================

interface OfflineState {
  isOnline: boolean;
  pendingActions: PendingAction[];
  lastSyncAt: Date | null;

  setOnline: (isOnline: boolean) => void;
  addPendingAction: (action: PendingAction) => void;
  removePendingAction: (id: string) => void;
  clearPendingActions: () => void;
  setLastSync: (date: Date) => void;
}

interface PendingAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingActions: [],
      lastSyncAt: null,

      setOnline: (isOnline) => set({ isOnline }),
      addPendingAction: (action) =>
        set((state) => ({ pendingActions: [...state.pendingActions, action] })),
      removePendingAction: (id) =>
        set((state) => ({ pendingActions: state.pendingActions.filter((a) => a.id !== id) })),
      clearPendingActions: () => set({ pendingActions: [] }),
      setLastSync: (date) => set({ lastSyncAt: date }),
    }),
    {
      name: 'salesflow-offline',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
