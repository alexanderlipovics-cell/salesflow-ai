import { createContext, useCallback, useContext, useState } from "react";

const FeatureGateContext = createContext(null);

export const FeatureGateProvider = ({ children }) => {
  const [state, setState] = useState({
    isOpen: false,
    featureLabel: null,
    requiredPlan: "pro",
  });

  const requestGate = useCallback((payload) => {
    setState({
      isOpen: true,
      featureLabel: payload?.featureLabel || "dieses Feature",
      requiredPlan: payload?.requiredPlan || "pro",
    });
  }, []);

  const closeGate = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <FeatureGateContext.Provider value={{ ...state, requestGate, closeGate }}>
      {children}
    </FeatureGateContext.Provider>
  );
};

export const useFeatureGate = () => {
  const context = useContext(FeatureGateContext);
  if (!context) {
    throw new Error("useFeatureGate must be used inside FeatureGateProvider");
  }
  return context;
};
