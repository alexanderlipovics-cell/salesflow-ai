import { createContext, useCallback, useContext, useState } from "react";

const PricingModalContext = createContext(null);

export const PricingModalProvider = ({ children }) => {
  const [state, setState] = useState({ isOpen: false, focusPlan: null });

  const open = useCallback((plan = null) => {
    // Navigate to /pricing using window.location since we're outside Router
    // Use window.location.href for navigation outside Router context
    if (typeof window !== "undefined") {
      window.location.href = "/pricing";
    }
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <PricingModalContext.Provider
      value={{ ...state, openPricing: open, closePricing: close }}
    >
      {children}
    </PricingModalContext.Provider>
  );
};

export const usePricingModal = () => {
  const context = useContext(PricingModalContext);
  if (!context) {
    throw new Error(
      "usePricingModal must be used within a PricingModalProvider"
    );
  }
  return context;
};
