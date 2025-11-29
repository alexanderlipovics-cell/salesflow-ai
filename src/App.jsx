import { useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PricingPage from "./components/PricingPage";
import PricingModal from "./components/PricingModal";
import FeatureGateModal from "./components/FeatureGateModal";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import ChatPage from "./pages/ChatPage";
import DailyCommandPage from "./pages/DailyCommandPage";
import {
  AlleToolsPage,
  CsvImportPage,
  EinwandKillerPage,
  LeadsCustomersPage,
  LeadsProspectsPage,
  NetworkDuplicationPage,
  NetworkTeamPage,
  PhoenixPage,
  ScreenshotAIPage,
  SpeedHunterPage,
} from "./pages/PlaceholderPages";
import AppShell from "./layout/AppShell";
import { UserProvider } from "./context/UserContext";
import { SubscriptionProvider } from "./hooks/useSubscription";
import { PricingModalProvider } from "./context/PricingModalContext";
import { FeatureGateProvider } from "./context/FeatureGateContext";
import { getBootstrapUser } from "./lib/user";

const App = () => {
  const bootstrapUser = useMemo(() => getBootstrapUser(), []);

  return (
    <UserProvider initialUser={bootstrapUser}>
      <SubscriptionProvider userId={bootstrapUser.id}>
        <PricingModalProvider>
          <FeatureGateProvider>
            <BrowserRouter>
              <div className="min-h-screen bg-gray-950 text-gray-100">
                <Routes>
                  <Route element={<AppShell />}>
                    <Route index element={<Navigate to="/chat" replace />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/daily-command" element={<DailyCommandPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/speed-hunter" element={<SpeedHunterPage />} />
                    <Route path="/phoenix" element={<PhoenixPage />} />
                    <Route path="/import/csv" element={<CsvImportPage />} />
                    <Route path="/screenshot-ai" element={<ScreenshotAIPage />} />
                    <Route path="/leads/prospects" element={<LeadsProspectsPage />} />
                    <Route path="/leads/customers" element={<LeadsCustomersPage />} />
                    <Route path="/network/team" element={<NetworkTeamPage />} />
                    <Route
                      path="/network/duplication"
                      element={<NetworkDuplicationPage />}
                    />
                    <Route path="/einwand-killer" element={<EinwandKillerPage />} />
                    <Route path="/tools" element={<AlleToolsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="*" element={<Navigate to="/chat" replace />} />
                </Routes>
                <PricingModal />
                <FeatureGateModal />
              </div>
            </BrowserRouter>
          </FeatureGateProvider>
        </PricingModalProvider>
      </SubscriptionProvider>
    </UserProvider>
  );
};

export default App;
