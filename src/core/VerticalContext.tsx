import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Vertical =
  | "chief"
  | "network_marketing"
  | "immo"
  | "finance"
  | "generic";

interface VerticalContextValue {
  vertical: Vertical;
  setVertical: (v: Vertical) => void;
  loading: boolean;
}

const VerticalContext = createContext<VerticalContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "salesflow_vertical";

export function VerticalProvider({ children }: { children: ReactNode }) {
  const [vertical, setVerticalState] = useState<Vertical>("chief");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setVerticalState(stored as Vertical);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  function setVertical(v: Vertical) {
    setVerticalState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore
    }
  }

  return (
    <VerticalContext.Provider value={{ vertical, setVertical, loading }}>
      {children}
    </VerticalContext.Provider>
  );
}

export function useVertical(): VerticalContextValue {
  const ctx = useContext(VerticalContext);
  if (!ctx) {
    throw new Error("useVertical must be used within VerticalProvider");
  }
  return ctx;
}

