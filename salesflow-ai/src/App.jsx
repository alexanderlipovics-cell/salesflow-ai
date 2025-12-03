import { useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PricingPage from "./components/PricingPage";
import PricingModal from "./components/PricingModal";
import FeatureGateModal from "./components/FeatureGateModal";
import SettingsPage from "./pages/SettingsPage";
import ChatPage from "./pages/ChatPage";
import { DailyCommandPage } from "./pages/DailyCommandPage";
import LeadsProspectsPage from "./pages/LeadsProspectsPage";
import LeadsCustomersPage from "./pages/LeadsCustomersPage";
import LeadHunterPage from "./pages/LeadHunterPage";
import HunterPage from "./pages/HunterPage";
import DelayMasterPage from "./pages/DelayMasterPage";
import ImportPage from "./pages/ImportPage";
import PhoenixPage from "./pages/PhoenixPage";
import FieldOpsPage from "./pages/FieldOpsPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import ObjectionBrainPage from "./pages/ObjectionBrainPage";
import ObjectionAnalyticsPage from "./pages/ObjectionAnalyticsPage";
import FollowUpTemplateManagerPage from "./pages/FollowUpTemplateManagerPage";
import CompanyKnowledgeSettingsPage from "./pages/CompanyKnowledgeSettingsPage";
import NextBestActionsPage from "./pages/NextBestActionsPage";
import SalesAiSettingsPage from "./pages/SalesAiSettingsPage";
import OnboardingWizardPage from "./pages/OnboardingWizardPage";
import PagePlaceholder from "./pages/PagePlaceholder";
import GtmCopyAssistantPage from "./pages/GtmCopyAssistantPage";
import AuthPage from "./pages/AuthPage";
import AppShell from "./layout/AppShell";
import ContactsPage from "@/pages/crm/ContactsPage";
import ContactDetailPage from "@/pages/crm/ContactDetailPage";
import PipelinePage from "@/pages/crm/PipelinePage";
import TemplateLeaderboardPage from "./pages/TemplateLeaderboardPage";
import AICoachPage from "./pages/AICoachPage";
import { AnalyticsDashboard } from "./pages/AnalyticsDashboard";
import { PowerHourPage } from "./pages/PowerHourPage";
import { ChurnRadarPage } from "./pages/ChurnRadarPage";
import { NetworkGraphPage } from "./pages/NetworkGraphPage";
import { RoleplayDojoPage } from "./pages/RoleplayDojoPage";
import TeamChiefDemoPage from "./pages/TeamChiefDemoPage";
import { UserProvider } from "./context/UserContext";
import { SubscriptionProvider } from "./hooks/useSubscription";
import { PricingModalProvider } from "./context/PricingModalContext";
import { FeatureGateProvider } from "./context/FeatureGateContext";
import { AuthProvider } from "./context/AuthContext";
import { getBootstrapUser } from "./lib/user";
import { VerticalProvider } from "./core/VerticalContext";
import ChooseVerticalPage from "./pages/ChooseVerticalPage";
import { useApiInitialization } from "./hooks/useApiInitialization";
import DashboardRouterPage from "./pages/DashboardRouterPage";
import DashboardPage from "./pages/DashboardPage.tsx";
import SquadCoachPage from "./pages/SquadCoachPage.tsx";
import MarketingLandingPage from "./pages/MarketingLandingPage";

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
        "Lade Listen mit Leads hoch und mappe die Felder auf Sales Flow Standards.",
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
      description: "Schneller Überblick über alles, was Sales Flow AI bietet.",
      highlights: ["Filter nach Job-to-be-done", "Favoriten anpinnbar"],
    },
  ];

  return (
    <AuthProvider>
      <UserProvider initialUser={bootstrapUser}>
        <SubscriptionProvider userId={bootstrapUser.id}>
          <PricingModalProvider>
            <FeatureGateProvider>
              <VerticalProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<MarketingLandingPage />} />
                    <Route path="/app" element={<Navigate to="/chat" replace />} />
                    <Route path="/onboarding" element={<OnboardingWizardPage />} />
                    <Route element={<AppShell />}>
                      <Route path="chat" element={<ChatPage />} />
                      <Route path="daily-command" element={<DailyCommandPage />} />
                      <Route path="hunter" element={<HunterPage />} />
                      <Route path="dashboard" element={<DashboardRouterPage />} />
                      <Route path="dashboard/complete" element={<DashboardPage />} />
                      <Route path="choose-vertical" element={<ChooseVerticalPage />} />
                      <Route path="pricing" element={<PricingPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="settings/ai" element={<SalesAiSettingsPage />} />
                      <Route path="gtm-copy" element={<GtmCopyAssistantPage />} />
                      <Route
                        path="leads/prospects"
                        element={<LeadsProspectsPage />}
                      />
                      <Route
                        path="leads/customers"
                        element={<LeadsCustomersPage />}
                      />
                      <Route path="import" element={<ImportPage />} />
                      <Route path="lead-hunter" element={<LeadHunterPage />} />
                      <Route path="delay-master" element={<DelayMasterPage />} />
                      <Route path="follow-ups" element={<FollowUpsPage />} />
                      <Route path="objections" element={<ObjectionBrainPage />} />
                      <Route path="next-best-actions" element={<NextBestActionsPage />} />
                      <Route path="demo/team-chief" element={<TeamChiefDemoPage />} />
                      <Route path="manager/objections" element={<ObjectionAnalyticsPage />} />
                      <Route path="manager/followup-templates" element={<FollowUpTemplateManagerPage />} />
                      <Route path="settings/knowledge" element={<CompanyKnowledgeSettingsPage />} />
                      <Route path="phoenix" element={<PhoenixPage />} />
                      <Route path="field-ops" element={<FieldOpsPage />} />
                      <Route path="crm/contacts" element={<ContactsPage />} />
                      <Route path="crm/contacts/:id" element={<ContactDetailPage />} />
                      <Route path="crm/pipeline" element={<PipelinePage />} />
                      <Route path="templates" element={<TemplateLeaderboardPage />} />
                      <Route path="coach" element={<AICoachPage />} />
                      <Route path="coach/squad" element={<SquadCoachPage />} />
                      <Route path="analytics" element={<AnalyticsDashboard />} />
                      <Route path="power-hour" element={<PowerHourPage />} />
                      <Route path="churn-radar" element={<ChurnRadarPage />} />
                      <Route path="network-graph" element={<NetworkGraphPage />} />
                      <Route path="roleplay-dojo" element={<RoleplayDojoPage />} />
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
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="*" element={<Navigate to="/chat" replace />} />
                  </Routes>
                  <PricingModal />
                  <FeatureGateModal />
                </BrowserRouter>
              </VerticalProvider>
            </FeatureGateProvider>
          </PricingModalProvider>
        </SubscriptionProvider>
      </UserProvider>
    </AuthProvider>
  );
};

export default App;
