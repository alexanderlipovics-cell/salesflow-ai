/**
 * Vertical Architecture - Context & Hooks
 * 
 * Lädt die Vertical-Config basierend auf dem eingeloggten User
 * und stellt Helper-Funktionen für Features und Terminologie bereit.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import type {
  VerticalConfig,
  Vertical,
} from "@/types/vertical";
import { DEFAULT_MLM_CONFIG } from "@/types/vertical";

interface VerticalContextValue {
  vertical: Vertical | null;
  config: VerticalConfig;
  loading: boolean;
  error: string | null;
  // Helper-Funktionen
  t: (key: string) => string; // Terminology-Übersetzung
  hasFeature: (path: string) => boolean; // Feature-Check
  refresh: () => Promise<void>; // Config neu laden
}

const VerticalContext = createContext<VerticalContextValue | undefined>(
  undefined
);

interface VerticalProviderProps {
  children: ReactNode;
  userId?: string; // Optional: User-ID, falls nicht aus Session verfügbar
}

/**
 * VerticalProvider - Lädt Vertical-Config beim App-Start
 */
export function VerticalProvider({
  children,
  userId: propUserId,
}: VerticalProviderProps) {
  const [vertical, setVertical] = useState<Vertical | null>(null);
  const [config, setConfig] = useState<VerticalConfig>(DEFAULT_MLM_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Lädt die Vertical-Config aus Supabase
   */
  const loadVerticalConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. User-ID ermitteln (aus Session oder Prop)
      let currentUserId: string | undefined = propUserId;
      if (!currentUserId) {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();
        currentUserId = session?.user?.id;
      }

      if (!currentUserId) {
        console.warn("No user ID available, using default MLM config");
        setConfig(DEFAULT_MLM_CONFIG);
        setLoading(false);
        return;
      }

      // 2. User mit vertical_id laden
        const { data: userData, error: userError } = await supabaseClient
          .from("users")
          .select("vertical")
          .eq("id", currentUserId)
          .single();

      if (userError) {
        console.warn("Error loading user vertical_id:", userError);
        setConfig(DEFAULT_MLM_CONFIG);
        setLoading(false);
        return;
      }

      const verticalId = userData?.vertical_id;
      if (!verticalId) {
        console.warn("No vertical_id set for user, using default MLM config");
        setConfig(DEFAULT_MLM_CONFIG);
        setLoading(false);
        return;
      }

      // 3. Vertical mit Config laden
      const { data: verticalData, error: verticalError } = await supabaseClient
        .from("verticals")
        .select("*")
        .eq("id", verticalId)
        .single();

      if (verticalError || !verticalData) {
        console.warn("Error loading vertical config:", verticalError);
        setConfig(DEFAULT_MLM_CONFIG);
        setLoading(false);
        return;
      }

      // 4. Config parsen und validieren
      try {
        const parsedConfig = verticalData.config as VerticalConfig;
        const verticalObj: Vertical = {
          id: verticalData.id,
          key: verticalData.key || "mlm",
          name: verticalData.name || "MLM",
          description: verticalData.description || undefined,
          config: parsedConfig,
          created_at: verticalData.created_at,
          updated_at: verticalData.updated_at,
        };

        setVertical(verticalObj);
        setConfig(parsedConfig);
      } catch (parseError) {
        console.error("Error parsing vertical config:", parseError);
        setConfig(DEFAULT_MLM_CONFIG);
      }
    } catch (err) {
      console.error("Error loading vertical config:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setConfig(DEFAULT_MLM_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    loadVerticalConfig();
  }, [propUserId]);

  // Helper: Terminology-Übersetzung
  const t = useMemo(
    () => (key: string): string => {
      return config.terminology[key] || key;
    },
    [config.terminology]
  );

  // Helper: Feature-Check (z.B. "crm" oder "team.genealogy")
  const hasFeature = useMemo(
    () => (path: string): boolean => {
      const parts = path.split(".");
      let current: any = config.features;

      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = current[part];
        } else {
          return false;
        }
      }

      return current === true;
    },
    [config.features]
  );

  // Refresh-Funktion
  const refresh = async () => {
    await loadVerticalConfig();
  };

  const value: VerticalContextValue = {
    vertical,
    config,
    loading,
    error,
    t,
    hasFeature,
    refresh,
  };

  return (
    <VerticalContext.Provider value={value}>
      {children}
    </VerticalContext.Provider>
  );
}

/**
 * useVertical Hook - Zugriff auf Vertical-Config
 */
export function useVertical(): VerticalContextValue {
  const ctx = useContext(VerticalContext);
  if (!ctx) {
    throw new Error("useVertical must be used within VerticalProvider");
  }
  return ctx;
}

/**
 * FeatureGuard Component - Rendert Children nur wenn Feature aktiviert ist
 */
interface FeatureGuardProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGuard({
  feature,
  children,
  fallback = null,
}: FeatureGuardProps) {
  const { hasFeature } = useVertical();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

