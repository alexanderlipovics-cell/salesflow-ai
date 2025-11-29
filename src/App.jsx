import { useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PricingPage from "./components/PricingPage";
import PricingModal from "./components/PricingModal";
import FeatureGateModal from "./components/FeatureGateModal";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import ChatPage from "./pages/ChatPage";
import DailyCommandPage from "./pages/DailyCommandPage";
import LeadsProspectsPage from "./pages/LeadsProspectsPage";
import LeadsCustomersPage from "./pages/LeadsCustomersPage";
import PagePlaceholder from "./pages/PagePlaceholder";
import AuthPage from "./pages/AuthPage";
import AppShell from "./layout/AppShell";
import { UserProvider } from "./context/UserContext";
import { SubscriptionProvider } from "./hooks/useSubscription";
import { PricingModalProvider } from "./context/PricingModalContext";
import { FeatureGateProvider } from "./context/FeatureGateContext";
import { AuthProvider } from "./context/AuthContext";
import { getBootstrapUser } from "./lib/user";

const App = () => {
  const bootstrapUser = useMemo(() => getBootstrapUser(), []);

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
      path: "/phoenix",
      title: "Phönix",
      description: "Alte Deals reaktivieren und warm machen.",
      highlights: [
        "AI-Wiederbelebung mit tonalem Match",
        "Playbooks für inaktive Accounts",
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
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<AppShell />}>
                    <Route index element={<Navigate to="/chat" replace />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="daily-command" element={<DailyCommandPage />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="pricing" element={<PricingPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route
                      path="leads/prospects"
                      element={<LeadsProspectsPage />}
                    />
                    <Route
                      path="leads/customers"
                      element={<LeadsCustomersPage />}
                    />
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
            </FeatureGateProvider>
          </PricingModalProvider>
        </SubscriptionProvider>
      </UserProvider>
    </AuthProvider>
  );
};

export default App;
