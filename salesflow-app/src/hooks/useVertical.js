/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - USE VERTICAL HOOK                                        ║
 * ║  React Hook für Multi-Vertical Support                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getUserVerticalSettings,
  setUserVertical,
  updateVerticalDailyFlow,
  updateVerticalFeatures,
  completeVerticalOnboarding,
} from '../services/verticalService';

// Vertical Definitionen (statisch, kein Zod im Frontend)
const VERTICALS = {
  network_marketing: {
    id: 'network_marketing',
    label: 'Network Marketing',
    icon: '🌐',
    color: '#8b5cf6',
    description: 'MLM, Direktvertrieb & Teamaufbau',
    hasCompensationPlan: true,
    hasTeamStructure: true,
    dailyFlowDefaults: { newContacts: 8, followups: 6, reactivations: 2 },
  },
  real_estate: {
    id: 'real_estate',
    label: 'Immobilien',
    icon: '🏠',
    color: '#10b981',
    description: 'Makler, Immobilienvermittlung & Investments',
    hasCompensationPlan: false,
    hasTeamStructure: false,
    dailyFlowDefaults: { newContacts: 5, followups: 8, reactivations: 2 },
  },
  coaching: {
    id: 'coaching',
    label: 'Coaching & Beratung',
    icon: '💼',
    color: '#f59e0b',
    description: 'Business Coaching, Life Coaching & Consulting',
    hasCompensationPlan: false,
    hasTeamStructure: false,
    dailyFlowDefaults: { newContacts: 5, followups: 6, reactivations: 2 },
  },
  finance: {
    id: 'finance',
    label: 'Finanzvertrieb',
    icon: '💰',
    color: '#3b82f6',
    description: 'Finanzberatung, Investments & Vermögensaufbau',
    hasCompensationPlan: true,
    hasTeamStructure: true,
    dailyFlowDefaults: { newContacts: 6, followups: 8, reactivations: 2 },
  },
  insurance: {
    id: 'insurance',
    label: 'Versicherung',
    icon: '🛡️',
    color: '#0ea5e9',
    description: 'Versicherungsvermittlung & Maklertätigkeit',
    hasCompensationPlan: false,
    hasTeamStructure: false,
    dailyFlowDefaults: { newContacts: 6, followups: 8, reactivations: 3 },
  },
  solar: {
    id: 'solar',
    label: 'Solar & Energie',
    icon: '☀️',
    color: '#eab308',
    description: 'Photovoltaik, Speicher & Energielösungen',
    hasCompensationPlan: false,
    hasTeamStructure: false,
    dailyFlowDefaults: { newContacts: 4, followups: 6, reactivations: 2 },
  },
  custom: {
    id: 'custom',
    label: 'Eigene Branche',
    icon: '⚙️',
    color: '#64748b',
    description: 'Individuelle Konfiguration',
    hasCompensationPlan: false,
    hasTeamStructure: false,
    dailyFlowDefaults: { newContacts: 8, followups: 6, reactivations: 2 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK: useVertical
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Haupt-Hook für Vertical-Management
 * 
 * @returns {Object} Vertical State und Funktionen
 * 
 * @example
 * const { 
 *   vertical, 
 *   settings,
 *   selectVertical,
 *   isLoading 
 * } = useVertical();
 */
export function useVertical() {
  // State
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Computed: Aktuelles Vertical
  const vertical = useMemo(() => {
    if (!settings?.vertical_id) return VERTICALS.network_marketing;
    return VERTICALS[settings.vertical_id] || VERTICALS.network_marketing;
  }, [settings]);

  // Computed: Alle verfügbaren Verticals
  const availableVerticals = useMemo(() => Object.values(VERTICALS), []);

  // Computed: Onboarding-Status
  const hasCompletedOnboarding = useMemo(
    () => settings?.onboarding_completed === true,
    [settings]
  );

  // Computed: Daily Flow Targets (Custom oder Default)
  const dailyFlowTargets = useMemo(() => {
    const defaults = vertical.dailyFlowDefaults;
    return {
      newContacts: settings?.custom_daily_contacts ?? defaults.newContacts,
      followups: settings?.custom_daily_followups ?? defaults.followups,
      reactivations: settings?.custom_daily_reactivations ?? defaults.reactivations,
    };
  }, [settings, vertical]);

  // Computed: Feature Flags
  const features = useMemo(() => ({
    leadScoring: settings?.enable_lead_scoring ?? true,
    proposalReminders: settings?.enable_proposal_reminders ?? true,
    teamDashboard: settings?.enable_team_dashboard ?? vertical.hasTeamStructure,
    financeTracking: settings?.enable_finance_tracking ?? true,
  }), [settings, vertical]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getUserVerticalSettings();
      setSettings(data);
      return data;
    } catch (err) {
      console.error('❌ Load Vertical Settings Error:', err);
      setError(err.message || 'Fehler beim Laden');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Vertical auswählen
   */
  const selectVertical = useCallback(async (verticalId, options = {}) => {
    setIsSaving(true);
    setError(null);

    try {
      const data = await setUserVertical(verticalId, options);
      setSettings(data);
      return data;
    } catch (err) {
      console.error('❌ Select Vertical Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Daily Flow Targets anpassen
   */
  const updateDailyFlow = useCallback(async (targets) => {
    setIsSaving(true);
    try {
      const data = await updateVerticalDailyFlow({
        dailyContacts: targets.newContacts,
        dailyFollowups: targets.followups,
        dailyReactivations: targets.reactivations,
      });
      setSettings(data);
      return data;
    } catch (err) {
      console.error('❌ Update Daily Flow Error:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Features aktualisieren
   */
  const updateFeatures = useCallback(async (newFeatures) => {
    setIsSaving(true);
    try {
      const data = await updateVerticalFeatures(newFeatures);
      setSettings(data);
      return data;
    } catch (err) {
      console.error('❌ Update Features Error:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Onboarding abschließen
   */
  const completeOnboarding = useCallback(async () => {
    setIsSaving(true);
    try {
      await completeVerticalOnboarding();
      await loadSettings(); // Reload
    } catch (err) {
      console.error('❌ Complete Onboarding Error:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [loadSettings]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Current Vertical
    vertical,
    verticalId: settings?.vertical_id || 'network_marketing',
    
    // Settings
    settings,
    dailyFlowTargets,
    features,
    companyId: settings?.company_id,
    
    // Status
    hasCompletedOnboarding,
    needsOnboarding: !isLoading && !hasCompletedOnboarding,
    
    // All Verticals
    availableVerticals,
    getVerticalById: (id) => VERTICALS[id],
    
    // Loading States
    isLoading,
    isSaving,
    error,
    
    // Actions
    selectVertical,
    updateDailyFlow,
    updateFeatures,
    completeOnboarding,
    refresh: loadSettings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useVerticalSelector
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook für Vertical-Auswahl UI
 * 
 * @example
 * const { options, selected, select, isLoading } = useVerticalSelector();
 */
export function useVerticalSelector() {
  const { 
    vertical, 
    availableVerticals, 
    selectVertical, 
    isLoading, 
    isSaving 
  } = useVertical();

  const options = useMemo(() => 
    availableVerticals.filter(v => v.id !== 'custom').map(v => ({
      id: v.id,
      label: v.label,
      icon: v.icon,
      color: v.color,
      description: v.description,
    })),
    [availableVerticals]
  );

  return {
    options,
    selected: vertical,
    select: selectVertical,
    isLoading: isLoading || isSaving,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { VERTICALS };
export default useVertical;

