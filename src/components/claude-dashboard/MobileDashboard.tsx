// ============================================
// 📱 SALESFLOW AI - MOBILE DASHBOARD SCREEN
// ============================================
// Features:
// - Hot Leads Carousel mit horizontal Swipe
// - Quick Action Bar (Bottom Navigation)
// - Pull-to-Refresh Funktionalität
// - Offline Support (PWA-ready)
// - Real-time Lead Updates
// - Performance optimiert (React.memo, useMemo)

'use client';

import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Avatar,
  Button,
  StatCard,
  Skeleton,
  EmptyState,
  PullToRefresh,
  BottomSheet,
  Tabs,
  ProgressBar,
} from '../ui/components';
import {
  useDashboardStats,
  useHotLeads,
  useScheduledFollowUps,
  useOverdueFollowUps,
  useNotifications,
  queryKeys,
} from '../../hooks/useClaudeApi';
import { useUIStore, useOfflineStore, useNotificationStore } from '../../stores';
import { cn, formatCurrency, formatRelativeTime, formatPercent, getInitials } from '../../utils/cn';
import type { Lead, DashboardStats, ScheduledFollowUp, Notification } from '../../types/salesflow-ui';

// ==================== ICONS ====================

const Icons = {
  Fire: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Euro: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Chat: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Mail: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Wifi: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
  WifiOff: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
    </svg>
  ),
};

// ==================== HOT LEAD CARD ====================

interface HotLeadCardProps {
  lead: Lead;
  onPress?: (lead: Lead) => void;
  onCall?: (lead: Lead) => void;
  onMessage?: (lead: Lead) => void;
}

const HotLeadCard = memo(({ lead, onPress, onCall, onMessage }: HotLeadCardProps) => {
  const priorityColors = {
    hot: 'from-orange-500 to-red-500',
    warm: 'from-amber-400 to-orange-500',
    cold: 'from-blue-400 to-cyan-500',
  };

  return (
    <Card
      variant="elevated"
      padding="none"
      interactive
      className="min-w-[280px] max-w-[280px] snap-center overflow-hidden"
      onClick={() => onPress?.(lead)}
    >
      {/* Gradient Header */}
      <div className={cn('h-2 bg-gradient-to-r', priorityColors[lead.priority])} />

      <div className="p-4">
        {/* Lead Info */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar
            src={lead.avatar}
            alt={`${lead.firstName} ${lead.lastName}`}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
              {lead.firstName} {lead.lastName}
            </h4>
            {lead.company && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {lead.position} @ {lead.company}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={lead.priority} size="sm">
                {lead.priority === 'hot' ? '🔥 Hot' : lead.priority === 'warm' ? '🌡️ Warm' : '❄️ Cold'}
              </Badge>
              <span className="text-xs text-gray-400">
                Score: {lead.score}
              </span>
            </div>
          </div>
        </div>

        {/* Score Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Lead Score</span>
            <span className="font-medium">{lead.score}/100</span>
          </div>
          <ProgressBar value={lead.score} color="gradient" size="sm" />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onCall?.(lead);
            }}
          >
            <Icons.Phone />
            Anrufen
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onMessage?.(lead);
            }}
          >
            <Icons.Mail />
            Nachricht
          </Button>
        </div>

        {/* Last Contact */}
        {lead.lastContactedAt && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            Letzter Kontakt: {formatRelativeTime(lead.lastContactedAt)}
          </p>
        )}
      </div>
    </Card>
  );
});
HotLeadCard.displayName = 'HotLeadCard';

// ==================== HOT LEADS CAROUSEL ====================

interface HotLeadsCarouselProps {
  leads: Lead[];
  isLoading?: boolean;
  onLeadPress?: (lead: Lead) => void;
  onCallLead?: (lead: Lead) => void;
  onMessageLead?: (lead: Lead) => void;
}

const HotLeadsCarousel = memo(({ leads, isLoading, onLeadPress, onCallLead, onMessageLead }: HotLeadsCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
        {[1, 2, 3].map((i) => (
          <div key={i} className="min-w-[280px] max-w-[280px]">
            <Skeleton variant="rectangular" height={240} className="rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!leads.length) {
    return (
      <EmptyState
        icon={<Icons.Fire />}
        title="Keine Hot Leads"
        description="Sobald neue Leads mit hohem Potenzial eingehen, erscheinen sie hier."
      />
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {leads.map((lead) => (
        <HotLeadCard
          key={lead.id}
          lead={lead}
          onPress={onLeadPress}
          onCall={onCallLead}
          onMessage={onMessageLead}
        />
      ))}
    </div>
  );
});
HotLeadsCarousel.displayName = 'HotLeadsCarousel';

// ==================== STATS OVERVIEW ====================

interface StatsOverviewProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

const StatsOverview = memo(({ stats, isLoading }: StatsOverviewProps) => {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rectangular" height={100} className="rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="Neue Leads"
        value={stats.leads.new}
        change={12}
        trend="up"
        icon={<Icons.Users />}
      />
      <StatCard
        label="Hot Leads"
        value={stats.leads.hot}
        icon={<Icons.Fire />}
      />
      <StatCard
        label="Conversion"
        value={formatPercent(stats.leads.conversionRate)}
        change={stats.leads.conversionRate > 10 ? 5 : -2}
        trend={stats.leads.conversionRate > 10 ? 'up' : 'down'}
        icon={<Icons.TrendingUp />}
      />
      <StatCard
        label="Umsatz"
        value={formatCurrency(stats.revenue.thisMonth)}
        change={stats.revenue.growth}
        trend={stats.revenue.growth >= 0 ? 'up' : 'down'}
        icon={<Icons.Euro />}
      />
    </div>
  );
});
StatsOverview.displayName = 'StatsOverview';

// ==================== FOLLOW-UP ITEM ====================

interface FollowUpItemProps {
  followUp: ScheduledFollowUp;
  isOverdue?: boolean;
  onPress?: (followUp: ScheduledFollowUp) => void;
}

const FollowUpItem = memo(({ followUp, isOverdue, onPress }: FollowUpItemProps) => (
  <div
    className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer',
      isOverdue
        ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
        : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
    )}
    onClick={() => onPress?.(followUp)}
  >
    <div className={cn(
      'w-10 h-10 rounded-full flex items-center justify-center',
      isOverdue ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
    )}>
      {isOverdue ? <Icons.AlertTriangle /> : <Icons.Clock />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 dark:text-white truncate">
        Follow-Up fällig
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {formatRelativeTime(followUp.scheduledAt)}
      </p>
    </div>
    <Icons.ChevronRight />
  </div>
));
FollowUpItem.displayName = 'FollowUpItem';

// ==================== QUICK ACTIONS ====================

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

interface QuickActionsBarProps {
  onAddLead: () => void;
  onOpenChat: () => void;
  onViewCalendar: () => void;
  onViewNotifications: () => void;
  notificationCount?: number;
}

const QuickActionsBar = memo(({
  onAddLead,
  onOpenChat,
  onViewCalendar,
  onViewNotifications,
  notificationCount = 0,
}: QuickActionsBarProps) => {
  const actions: QuickAction[] = useMemo(() => [
    {
      id: 'add',
      label: 'Lead',
      icon: <Icons.Plus />,
      color: 'bg-blue-500',
      action: onAddLead,
    },
    {
      id: 'chat',
      label: 'AI Chat',
      icon: <Icons.Chat />,
      color: 'bg-purple-500',
      action: onOpenChat,
    },
    {
      id: 'calendar',
      label: 'Kalender',
      icon: <Icons.Calendar />,
      color: 'bg-green-500',
      action: onViewCalendar,
    },
    {
      id: 'notifications',
      label: 'Alerts',
      icon: <Icons.Bell />,
      color: 'bg-amber-500',
      action: onViewNotifications,
    },
  ], [onAddLead, onOpenChat, onViewCalendar, onViewNotifications]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 safe-area-pb">
      <div className="flex justify-around items-center py-2 px-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-transform active:scale-95"
          >
            <div className={cn(
              'relative w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg',
              action.color
            )}>
              {action.icon}
              {action.id === 'notifications' && notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});
QuickActionsBar.displayName = 'QuickActionsBar';

// ==================== OFFLINE BANNER ====================

const OfflineBanner = memo(() => {
  const { isOnline, pendingActions } = useOfflineStore();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 safe-area-pt">
      <Icons.WifiOff />
      <span className="text-sm font-medium">
        Offline-Modus
        {pendingActions.length > 0 && ` • ${pendingActions.length} ausstehende Aktionen`}
      </span>
    </div>
  );
});
OfflineBanner.displayName = 'OfflineBanner';

// ==================== MAIN DASHBOARD SCREEN ====================

export function MobileDashboardScreen() {
  const queryClient = useQueryClient();
  const { addToast, openModal, openBottomSheet } = useUIStore();
  const { isOnline, setOnline } = useOfflineStore();
  const { unreadCount } = useNotificationStore();

  // Data fetching
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const { data: hotLeadsData, isLoading: hotLeadsLoading, refetch: refetchHotLeads } = useHotLeads(6);
  const { data: scheduledData, isLoading: scheduledLoading } = useScheduledFollowUps();
  const { data: overdueData } = useOverdueFollowUps();
  const { data: notificationsData } = useNotifications();

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchStats(),
      refetchHotLeads(),
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledFollowUps }),
      queryClient.invalidateQueries({ queryKey: queryKeys.overdueFollowUps }),
    ]);
    addToast({ type: 'success', title: 'Aktualisiert!' });
  }, [refetchStats, refetchHotLeads, queryClient, addToast]);

  // Action handlers
  const handleLeadPress = useCallback((lead: Lead) => {
    openModal('lead-detail', { leadId: lead.id });
  }, [openModal]);

  const handleCallLead = useCallback((lead: Lead) => {
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    } else {
      addToast({ type: 'warning', title: 'Keine Telefonnummer', message: 'Dieser Lead hat keine Telefonnummer hinterlegt.' });
    }
  }, [addToast]);

  const handleMessageLead = useCallback((lead: Lead) => {
    openModal('compose-message', { leadId: lead.id, leadName: `${lead.firstName} ${lead.lastName}` });
  }, [openModal]);

  const handleAddLead = useCallback(() => {
    openModal('add-lead');
  }, [openModal]);

  const handleOpenChat = useCallback(() => {
    openModal('ai-chat');
  }, [openModal]);

  const handleViewCalendar = useCallback(() => {
    openBottomSheet('calendar');
  }, [openBottomSheet]);

  const handleViewNotifications = useCallback(() => {
    openBottomSheet('notifications');
  }, [openBottomSheet]);

  const handleFollowUpPress = useCallback((followUp: ScheduledFollowUp) => {
    openModal('followup-detail', { followUpId: followUp.id });
  }, [openModal]);

  // Memoized data
  const stats = useMemo(() => statsData?.data, [statsData]);
  const hotLeads = useMemo(() => hotLeadsData?.data || [], [hotLeadsData]);
  const scheduledFollowUps = useMemo(() => scheduledData?.data?.slice(0, 3) || [], [scheduledData]);
  const overdueFollowUps = useMemo(() => overdueData?.data?.slice(0, 3) || [], [overdueData]);
  const notificationCount = useMemo(
    () => notificationsData?.data?.filter((n) => !n.isRead).length || 0,
    [notificationsData]
  );

  // Current greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <OfflineBanner />

      <PullToRefresh onRefresh={handleRefresh} className="pb-28">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 safe-area-pt">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{greeting}</p>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  SalesFlow AI
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {!isOnline && (
                  <Badge variant="warning" size="sm">
                    <Icons.WifiOff />
                    Offline
                  </Badge>
                )}
                <button
                  onClick={handleViewNotifications}
                  className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Icons.Bell />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 py-6 space-y-6">
          {/* Stats Overview */}
          <section>
            <StatsOverview stats={stats} isLoading={statsLoading} />
          </section>

          {/* Hot Leads */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Icons.Fire />
                Hot Leads
              </h2>
              <Button variant="ghost" size="sm">
                Alle anzeigen
                <Icons.ChevronRight />
              </Button>
            </div>
            <HotLeadsCarousel
              leads={hotLeads}
              isLoading={hotLeadsLoading}
              onLeadPress={handleLeadPress}
              onCallLead={handleCallLead}
              onMessageLead={handleMessageLead}
            />
          </section>

          {/* Overdue Follow-Ups */}
          {overdueFollowUps.length > 0 && (
            <section>
              <Card variant="default" padding="md" className="border-red-200 dark:border-red-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Icons.AlertTriangle />
                    Überfällige Follow-Ups
                  </CardTitle>
                  <Badge variant="danger" size="sm">{overdueFollowUps.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overdueFollowUps.map((followUp) => (
                    <FollowUpItem
                      key={followUp.id}
                      followUp={followUp}
                      isOverdue
                      onPress={handleFollowUpPress}
                    />
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Upcoming Follow-Ups */}
          <section>
            <Card variant="default" padding="md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.Calendar />
                  Anstehende Follow-Ups
                </CardTitle>
                <Badge variant="primary" size="sm">{scheduledFollowUps.length}</Badge>
              </CardHeader>
              <CardContent>
                {scheduledLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} variant="rectangular" height={64} className="rounded-xl" />
                    ))}
                  </div>
                ) : scheduledFollowUps.length > 0 ? (
                  <div className="space-y-2">
                    {scheduledFollowUps.map((followUp) => (
                      <FollowUpItem
                        key={followUp.id}
                        followUp={followUp}
                        onPress={handleFollowUpPress}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Icons.Calendar />}
                    title="Keine Follow-Ups"
                    description="Du hast aktuell keine geplanten Follow-Ups."
                  />
                )}
              </CardContent>
            </Card>
          </section>

          {/* Quick Tips */}
          <section>
            <Card variant="gradient" padding="lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                  <Icons.Chat />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    AI-Tipp des Tages
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Leads, die innerhalb von 5 Minuten kontaktiert werden, haben eine 21x höhere Conversion-Rate.
                    Aktiviere Push-Benachrichtigungen für Hot Leads!
                  </p>
                  <Button variant="primary" size="sm" className="mt-3">
                    Benachrichtigungen aktivieren
                  </Button>
                </div>
              </div>
            </Card>
          </section>
        </main>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <QuickActionsBar
        onAddLead={handleAddLead}
        onOpenChat={handleOpenChat}
        onViewCalendar={handleViewCalendar}
        onViewNotifications={handleViewNotifications}
        notificationCount={notificationCount}
      />
    </div>
  );
}

export default MobileDashboardScreen;
