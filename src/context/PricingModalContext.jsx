import { createContext, useCallback, useContext, useState } from "react";

const PricingModalContext = createContext(null);

export const PricingModalProvider = ({ children }) => {
  const [state, setState] = useState({ isOpen: false, focusPlan: null });

  const open = useCallback((plan = null) => {
    setState({ isOpen: true, focusPlan: plan });
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
