import React, { useCallback } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  MessageCircle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboardData";
import { SFKpiCard } from "@/components/sf/SFKpiCard";
import { TodayTasksCard } from "@/components/dashboard/TodayTasksCard";
import { TemplatePerformanceCard } from "@/components/dashboard/TemplatePerformanceCard";
import { FunnelStatsCard } from "@/components/dashboard/FunnelStatsCard";
import { SquadCoachCard } from "@/components/dashboard/SquadCoachCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useUser } from "@/context/UserContext";

interface DashboardPageProps {
  workspaceId: string;
}

const DashboardPageContent: React.FC<DashboardPageProps> = ({ workspaceId }) => {
  const { toast } = useToast();

  const dashboard = useDashboard(workspaceId, {
    refetchInterval: 120000,
    onError: (section, error) => {
      toast({
        variant: "destructive",
        title: `Fehler in ${section}`,
        description: error.message,
      });
    },
  });

  const handleRefresh = useCallback(() => {
    dashboard.refetchAll();
    toast({
      title: "Dashboard aktualisiert",
      description: "Alle Daten wurden neu geladen",
    });
  }, [dashboard, toast]);

  const handleTaskClick = useCallback((taskId: string) => {
    console.log("Task clicked:", taskId);
  }, []);

  const handleRepClick = useCallback((userId: string) => {
    console.log("Rep clicked:", userId);
  }, []);

  if (dashboard.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sf-text-muted">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Dashboard wird geladen …</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 px-4 py-4 md:px-8 md:py-6">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Sales Flow AI – Dashboard
          </h1>
          <p className="mt-1 text-sm text-sf-text-muted">
            Dein Daily Flow: Leads, Follow-ups und Team-Performance auf einen Blick.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-sf-text-muted">
            <Sparkles className="h-4 w-4 text-sf-primary" aria-hidden="true" />
            <span>Squad Coach aktiv</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={dashboard.isLoading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${dashboard.isLoading ? "animate-spin" : ""}`}
            />
            Aktualisieren
          </Button>
        </div>
      </motion.header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SFKpiCard
          label="Neue Leads heute"
          value={dashboard.todayOverview?.leads_created_today ?? 0}
          icon={UserPlus}
          isLoading={dashboard.loadingStates.todayOverview}
        />
        <SFKpiCard
          label="Erstkontakte heute"
          value={dashboard.todayOverview?.first_messages_today ?? 0}
          icon={MessageCircle}
          isLoading={dashboard.loadingStates.todayOverview}
        />
        <SFKpiCard
          label="Signups heute"
          value={dashboard.todayOverview?.signups_today ?? 0}
          icon={CheckCircle2}
          isLoading={dashboard.loadingStates.todayOverview}
        />
        <SFKpiCard
          label="Umsatz heute"
          value={
            dashboard.todayOverview?.revenue_today
              ? new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                }).format(dashboard.todayOverview.revenue_today)
              : "0,00 €"
          }
          icon={TrendingUp}
          isLoading={dashboard.loadingStates.todayOverview}
        />
      </div>

      <TodayTasksCard
        tasks={dashboard.todayTasks}
        tasksCompleted={dashboard.todayOverview?.tasks_done_today ?? 0}
        tasksOpen={dashboard.todayOverview?.tasks_due_today ?? 0}
        isLoading={dashboard.loadingStates.todayTasks}
        onTaskClick={handleTaskClick}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TemplatePerformanceCard
          templates={dashboard.topTemplates}
          isLoading={dashboard.loadingStates.topTemplates}
        />
        <FunnelStatsCard
          stats={dashboard.funnelStats}
          isLoading={dashboard.loadingStates.funnelStats}
        />
      </div>

      <SquadCoachCard
        topNetworkers={dashboard.topNetworkers}
        needHelpReps={dashboard.needHelpReps}
        isLoading={
          dashboard.loadingStates.topNetworkers ||
          dashboard.loadingStates.needHelpReps
        }
        onRepClick={handleRepClick}
      />
    </div>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = (props) => (
  <ErrorBoundary>
    <DashboardPageContent {...props} />
  </ErrorBoundary>
);

export default function DashboardPageWithUser() {
  const user = useUser();
  const workspaceId = (user?.workspace_id as string) ?? "demo-workspace";
  return <DashboardPage workspaceId={workspaceId} />;
}

