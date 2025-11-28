import { useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import PricingPage from "./components/PricingPage";
import PricingModal from "./components/PricingModal";
import FeatureGateModal from "./components/FeatureGateModal";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
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
              <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
                <Navbar />
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
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
