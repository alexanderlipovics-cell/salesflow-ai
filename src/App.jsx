import React, { useMemo, lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import PricingModal from "./components/PricingModal";
import FeatureGateModal from "./components/FeatureGateModal";
import AppShell from "./layout/AppShell";
import { UserProvider } from "./context/UserContext";
import { SubscriptionProvider } from "./hooks/useSubscription";
import { PricingModalProvider } from "./context/PricingModalContext";
import { FeatureGateProvider } from "./context/FeatureGateContext";
import { AuthProvider } from "./context/AuthContext";
import { VerticalProvider as CoreVerticalProvider } from "./core/VerticalContext";
import { getBootstrapUser } from "./lib/user";
import { useApiInitialization } from "./hooks/useApiInitialization";
import { ProtectedRoute } from "./components/auth";
import { ToastProvider } from "./components/Toast";
import { legacyRouteRedirects } from './config/navigation';
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage.tsx";
import FinancePage from "./pages/FinancePage.tsx";

// Add this component for legacy route redirects
const LegacyRouteHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const redirect = legacyRouteRedirects[location.pathname];
    if (redirect) {
      navigate(redirect, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};

const PageLoader = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400">Laden...</p>
    </div>
  </div>
);

const PricingPage = lazy(() => import("./pages/PricingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"));
const DailyCommandPage = lazy(() =>
  import("./pages/DailyCommandPage").then((m) => ({ default: m.DailyCommandPage }))
);
const LeadsProspectsPage = lazy(() => import("./pages/LeadsProspectsPage"));
const LeadsCustomersPage = lazy(() => import("./pages/LeadsCustomersPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const LeadHunterPage = lazy(() => import("./pages/LeadHunterPage"));
const HunterPage = lazy(() => import("./pages/HunterPage"));
const DelayMasterPage = lazy(() => import("./pages/DelayMasterPage"));
const ImportPage = lazy(() => import("./pages/ImportPage"));
const PhoenixPage = lazy(() => import("./pages/PhoenixPage"));
const FieldOpsPage = lazy(() => import("./pages/FieldOpsPage"));
const FollowUpsPage = lazy(() => import("./pages/FollowUpsPage"));
const ObjectionsPage = lazy(() => import("./pages/ObjectionsPage"));
const FollowUpTemplateManagerPage = lazy(() => import("./pages/FollowUpTemplateManagerPage"));
const CompanyKnowledgeSettingsPage = lazy(() => import("./pages/CompanyKnowledgeSettingsPage"));
const NextBestActionsPage = lazy(() => import("./pages/NextBestActionsPage"));
const SalesAiSettingsPage = lazy(() => import("./pages/SalesAiSettingsPage"));
const PagePlaceholder = lazy(() => import("./pages/PagePlaceholder"));
const GtmCopyAssistantPage = lazy(() => import("./pages/GtmCopyAssistantPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ContactsPage = lazy(() => import("@/pages/crm/ContactsPage"));
const ContactDetailPage = lazy(() => import("@/pages/crm/ContactDetailPage"));
const PipelinePage = lazy(() => import("@/pages/crm/PipelinePage"));
const LeadsPage = lazy(() => import("@/pages/crm/LeadsPage"));
const LeadList = lazy(() => import("@/pages/LeadList"));
const LeadImport = lazy(() => import("@/pages/LeadImport"));
const LeadDetailPage = lazy(() => import("@/pages/crm/LeadDetailPage"));
const TemplateLeaderboardPage = lazy(() => import("./pages/TemplateLeaderboardPage"));
const AICoachPage = lazy(() => import("./pages/AICoachPage"));
const AnalyticsDashboard = lazy(() =>
  import("./pages/AnalyticsDashboard").then((m) => ({ default: m.AnalyticsDashboard }))
);
const PowerHourPage = lazy(() => import("./pages/PowerHourPage"));
const ChurnRadarPage = lazy(() =>
  import("./pages/ChurnRadarPage").then((m) => ({ default: m.ChurnRadarPage }))
);
const NetworkDashboard = lazy(() => import("./pages/NetworkDashboard"));
const NetworkGraphPage = lazy(() =>
  import("./pages/NetworkGraphPage").then((m) => ({ default: m.NetworkGraphPage }))
);
const NetworkSettingsPage = lazy(() => import("./pages/NetworkSettingsPage"));
const BusinessSettingsPage = lazy(() => import("./pages/BusinessSettingsPage"));
const RoleplayDojoPage = lazy(() =>
  import("./pages/RoleplayDojoPage").then((m) => ({ default: m.RoleplayDojoPage }))
);
const CompensationSimulatorPage = lazy(() => import("./pages/CompensationSimulatorPage"));
const GenealogyTreePage = lazy(() => import("./pages/GenealogyTreePage"));
const CommissionTrackerPage = lazy(() => import("./pages/CommissionTrackerPage"));
const ColdCallAssistantPage = lazy(() => import("./pages/ColdCallAssistantPage"));
const PerformanceInsightsPage = lazy(() => import("./pages/PerformanceInsightsPage"));
const GamificationPage = lazy(() => import("./pages/GamificationPage"));
const ClosingCoachPage = lazy(() => import("./pages/ClosingCoachPage"));
const LeadQualifierPage = lazy(() => import("./pages/LeadQualifierPage"));
const LeadDiscoveryPage = lazy(() => import("./pages/LeadDiscoveryPage"));
const ChooseVerticalPage = lazy(() => import("./pages/ChooseVerticalPage"));
const TeamCoachPage = lazy(() => import("./pages/TeamCoachPage"));
const MarketingLandingPage = lazy(() => import("./pages/MarketingLandingPage"));
const CompactLandingPage = lazy(() => import("./pages/CompactLandingPage"));
const VerticalLandingPage = lazy(() => import("./pages/VerticalLandingPage"));
const AutopilotPage = lazy(() => import("./pages/AutopilotPage"));
const BillingManagement = lazy(() => import("./pages/BillingManagement"));
const AIPromptsPage = lazy(() => import("./pages/AIPromptsPage"));
const NetworkMarketingDashboard = lazy(() => import("./pages/NetworkMarketingDashboard"));
const FreebiesPage = lazy(() => import("./pages/FreebiesPage"));
const FreebieWizardPage = lazy(() => import("./pages/FreebieWizardPage"));
const PublicFreebiePage = lazy(() => import("./pages/PublicFreebiePage"));
const FreebieStatsPage = lazy(() => import("./pages/FreebieStatsPage"));
const PlaybookPage = lazy(() => import("./pages/PlaybookPage"));
const VideoMeetingsPage = lazy(() => import("./pages/VideoMeetingsPage"));
const SquadChallengeManager = lazy(() => import("./pages/SquadChallengeManager"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const MagicSendDemo = lazy(() => import("./pages/MagicSendDemo"));
const FollowUpAnalyticsPage = lazy(() => import("./pages/FollowUpAnalyticsPage"));
const SequencesPage = lazy(() => import("./pages/SequencesPage"));
const ProposalsPage = lazy(() => import("./pages/ProposalsPage"));
const EmailsPage = lazy(() => import("./pages/EmailsPageV2"));
const SettingsEmailPage = lazy(() => import("./pages/SettingsEmailPage"));
const ApprovalInboxPage = lazy(() => import("./pages/ApprovalInboxPage"));
const InboxPage = lazy(() => import("./components/Inbox/InboxPage").then((m) => ({ default: m.default })));
const ImpressumPage = lazy(() => import("./pages/ImpressumPage"));
const DatenschutzPage = lazy(() => import("./pages/DatenschutzPage"));
const AGBPage = lazy(() => import("./pages/AGBPage"));
const CeoChat = lazy(() => import("./pages/CeoChat"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const CommandCenterV2 = lazy(() => import("./pages/CommandCenterV2"));

const App = () => {
  const bootstrapUser = useMemo(() => getBootstrapUser(), []);
  
  // Initialize API managers (auth, offline queue, etc.)
  useApiInitialization();

  const placeholderRoutes = [
    {
      path: "/network/team",
      title: "Mein Team",
      description:
        "Baue Pods aus Closern, SDRs und Success gemeinsam auf. Zuweisungen laufen automatisch über Regeln.",
      highlights: [
        "Team-Permissions und Playbook Sharing",
        "Benachrichtigungen, sobald neue Leads landen",
      ],
    },
    {
      path: "/network/duplication",
      title: "Duplikation",
      description:
        "Skaliere funktionierende Sequenzen in deine Teams – inklusive Qualitätskontrolle.",
      highlights: ["Playbook Publisher", "QA-Review Layer"],
    },
    {
      path: "/screenshot-ai",
      title: "Screenshot AI",
      description:
        "Zieh wichtige Insights direkt aus Screenshots, Slides oder Whiteboards.",
      highlights: [
        "OCR + KI-Zusammenfassung",
        "Direkte Übergabe an Chat & Speed-Hunter",
      ],
    },
    {
      path: "/import/csv",
      title: "CSV Import",
      description:
        "Lade Listen mit Leads hoch und mappe die Felder auf Al Sales Systems Standards.",
      highlights: ["CSV/XLSX Mapping", "Dublettenerkennung"],
    },
    {
      path: "/speed-hunter",
      title: "Speed-Hunter",
      description: "Batch-Nachrichten mit persönlichem Touch.",
      highlights: [
        "AI-Personalisierung für 50 Kontakte gleichzeitig",
        "Works mit LinkedIn, Mail und WhatsApp",
      ],
    },
    {
      path: "/einwand-killer",
      title: "Einwand-Killer",
      description: "Live-Objections auflösen – skripte und Snippets.",
      highlights: [
        "Snippets für Pricing, Timing, Budget",
        "Sofort in Chat & Sequenzen einsetzbar",
      ],
    },
    {
      path: "/knowledge-base",
      title: "Playbooks & Knowledge Base",
      description:
        "Greif auf Network Marketing Pro Playbooks, Trainings und Snippets zu.",
      highlights: [
        "Job-to-be-done Playbooks",
        "Mindset Notes & Call Scripts",
      ],
    },
    {
      path: "/all-tools",
      title: "Alle Tools",
      description: "Schneller Überblick über alles, was Al Sales Systems bietet.",
      highlights: ["Filter nach Job-to-be-done", "Favoriten anpinnbar"],
    },
  ];

  return (
    <AuthProvider>
      <CoreVerticalProvider>
      <UserProvider initialUser={bootstrapUser}>
        <SubscriptionProvider userId={bootstrapUser.id}>
          <PricingModalProvider>
            <FeatureGateProvider>
                <BrowserRouter>
                  <ToastProvider />
                  <LegacyRouteHandler />
                  <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Password Reset muss Hash-Token verarbeiten (vor allen anderen) */}
                    <Route path="/reset-password" element={<ResetPasswordPage />} />

                    {/* Public Routes - Auth Pages */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    
                    {/* Marketing/Landing */}
                    <Route path="/" element={<CompactLandingPage />} />
                    <Route path="/full" element={<MarketingLandingPage />} />
                    <Route path="/app" element={<Navigate to="/chat" replace />} />
                    
                    {/* Vertical-specific Landing Pages */}
                    <Route path="/networker" element={<VerticalLandingPage />} />
                    <Route path="/immobilien" element={<VerticalLandingPage />} />
                    <Route path="/coaching" element={<VerticalLandingPage />} />
                    <Route path="/finanzvertrieb" element={<VerticalLandingPage />} />
                    <Route path="/versicherung" element={<VerticalLandingPage />} />
                    <Route path="/solar" element={<VerticalLandingPage />} />
                    <Route path="/handelsvertreter" element={<VerticalLandingPage />} />
                    <Route path="/aussendienst" element={<VerticalLandingPage />} />
                    <Route path="/freelance" element={<VerticalLandingPage />} />
                    
                    {/* Magic Send Demo (Public for testing) */}
                    <Route path="/magic-send" element={<MagicSendDemo />} />
                    
                    {/* Public Freebie Landing Page (no login required) */}
                    <Route path="/f/:slug" element={<PublicFreebiePage />} />
                    
                    {/* Public Playbook Page (no login required) */}
                    <Route path="/playbook" element={<PlaybookPage />} />
                    
                    {/* Legal Pages (Public) */}
                    <Route path="/impressum" element={<ImpressumPage />} />
                    <Route path="/datenschutz" element={<DatenschutzPage />} />
                    <Route path="/agb" element={<AGBPage />} />
                    
                    {/* Protected Routes - Main App */}
                    <Route element={
                      <ProtectedRoute>
                        <AppShell />
                      </ProtectedRoute>
                    }>
                      <Route path="chat" element={<ChatPage />} />
                      <Route path="daily-command" element={<DailyCommandPage />} />
                      <Route path="hunter" element={<HunterPage />} />
                      <Route path="dashboard" element={<DashboardPage />} />
                      <Route path="command" element={<CommandCenterV2 />} />
                      <Route path="command-v1" element={<CommandCenter />} />
                      <Route path="choose-vertical" element={<ChooseVerticalPage />} />
                      <Route path="pricing" element={<PricingPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="settings/business" element={<BusinessSettingsPage />} />
                      <Route path="integrations" element={<IntegrationsPage />} />
                      <Route path="settings/email" element={<Navigate to="/settings?tab=email" replace />} />
                      <Route path="billing" element={<BillingManagement />} />
                      <Route path="finance" element={<FinancePage />} />
                      <Route path="follow-up-analytics" element={<FollowUpAnalyticsPage />} />
                      <Route path="commissions" element={<Navigate to="/finance?tab=commissions" replace />} />
                      <Route path="commission-tracker" element={<Navigate to="/finance?tab=commissions" replace />} />
                      <Route path="cold-call" element={<ColdCallAssistantPage />} />
                      <Route path="closing-coach" element={<ClosingCoachPage />} />
                      <Route path="performance" element={<PerformanceInsightsPage />} />
                      <Route path="gamification" element={<GamificationPage />} />
                      <Route path="lead-qualifier" element={<Navigate to="/leads?view=qualifier" replace />} />
                      <Route path="lead-discovery" element={<Navigate to="/leads?view=discovery" replace />} />
                      <Route path="settings/ai" element={<Navigate to="/settings?tab=ai" replace />} />
                      <Route path="inbox" element={<InboxPage />} />
                      <Route path="inbox/approvals" element={<ApprovalInboxPage />} />
                      <Route path="gtm-copy" element={<GtmCopyAssistantPage />} />
                      <Route
                        path="leads/prospects"
                        element={<Navigate to="/leads?view=prospects" replace />}
                      />
                      <Route path="leads/customers" element={<LeadsCustomersPage />} />
                      <Route path="calendar" element={<CalendarPage />} />
                      <Route path="import" element={<ImportPage />} />
                      <Route path="lead-hunter" element={<Navigate to="/leads?view=hunter" replace />} />
                      <Route path="delay-master" element={<DelayMasterPage />} />
                      <Route path="follow-ups" element={<FollowUpsPage />} />
                      <Route path="sequences" element={<SequencesPage />} />
                      <Route path="proposals" element={<ProposalsPage />} />
                      <Route path="emails" element={<EmailsPage />} />
                      <Route path="objections" element={<ObjectionsPage />} />
                      <Route path="objection-brain" element={<Navigate to="/objections?tab=brain" replace />} />
                      <Route path="next-best-actions" element={<NextBestActionsPage />} />
                      <Route path="demo/team-chief" element={<Navigate to="/team-coach?tab=performance" replace />} />
                      <Route path="manager/objections" element={<Navigate to="/objections?tab=analytics" replace />} />
                      <Route path="manager/followup-templates" element={<FollowUpTemplateManagerPage />} />
                      <Route path="settings/knowledge" element={<Navigate to="/settings?tab=company" replace />} />
                      <Route path="phoenix" element={<PhoenixPage />} />
                      <Route path="field-ops" element={<FieldOpsPage />} />
                      <Route path="crm/contacts" element={<ContactsPage />} />
                      <Route path="crm/contacts/:id" element={<ContactDetailPage />} />
                      <Route path="crm/pipeline" element={<PipelinePage />} />
                      <Route path="crm/leads" element={<Navigate to="/leads" replace />} />
                      <Route path="crm/leads/:leadId" element={<Navigate to="/leads/:leadId" replace />} />
                      <Route path="lead-list" element={<LeadList />} />
                      <Route path="lead-list/import" element={<LeadImport />} />
                      <Route path="leads" element={<LeadsPage />} />
                      <Route path="leads/:leadId" element={<LeadDetailPage />} />
                      <Route path="templates" element={<TemplateLeaderboardPage />} />
                      <Route path="coach" element={<AICoachPage />} />
                      <Route path="team-coach" element={<TeamCoachPage />} />
                      <Route path="coach/squad" element={<Navigate to="/team-coach" replace />} />
                      <Route path="analytics" element={<AnalyticsDashboard />} />
                      <Route path="autopilot" element={<AutopilotPage />} />
                      <Route path="power-hour" element={<PowerHourPage />} />
                      <Route path="churn-radar" element={<ChurnRadarPage />} />
                      <Route path="network-graph" element={<NetworkGraphPage />} />
                      <Route path="network" element={<NetworkDashboard />} />
                      <Route path="network/settings" element={<NetworkSettingsPage />} />
                      <Route path="roleplay-dojo" element={<RoleplayDojoPage />} />
                      <Route path="magic-send" element={<MagicSendDemo />} />
                      <Route path="compensation-simulator" element={<CompensationSimulatorPage />} />
                      <Route path="genealogy" element={<GenealogyTreePage />} />
                      <Route path="ai-prompts" element={<Navigate to="/settings?tab=prompts" replace />} />
                      <Route path="mlm-dashboard" element={<NetworkMarketingDashboard />} />
                      <Route path="freebies" element={<FreebiesPage />} />
                      <Route path="freebies/create" element={<FreebieWizardPage />} />
                      <Route path="freebies/:id/edit" element={<FreebieWizardPage />} />
                      <Route path="freebies/:id" element={<FreebieStatsPage />} />
                      <Route path="meetings" element={<VideoMeetingsPage />} />
                      <Route path="challenges" element={<SquadChallengeManager />} />
                      <Route path="coach/priority" element={<Navigate to="/team-coach?tab=priorities" replace />} />
                      <Route path="coach/v2" element={<Navigate to="/team-coach" replace />} />
                      <Route path="ceo-chat" element={<CeoChat />} />
                      {placeholderRoutes.map((route) => (
                        <Route
                          key={route.path}
                          path={route.path.replace(/^\//, "")}
                          element={
                            <PagePlaceholder
                              title={route.title}
                              description={route.description}
                              highlights={route.highlights}
                            />
                          }
                        />
                      ))}
                    </Route>
                    
                    {/* Fallback - Redirect to login if not authenticated */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                  </Suspense>
                  <PricingModal />
                  <FeatureGateModal />
                </BrowserRouter>
            </FeatureGateProvider>
          </PricingModalProvider>
        </SubscriptionProvider>
      </UserProvider>
      </CoreVerticalProvider>
    </AuthProvider>
  );
};

export default App;
