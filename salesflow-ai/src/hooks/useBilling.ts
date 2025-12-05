/**
 * useBilling Hook
 * Subscription & Usage Management
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { billingApi, Subscription, UsageData, PlanLimits } from '../api/billing';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface UseBillingResult {
  // State
  subscription: Subscription | null;
  usage: UsageData | null;
  loading: boolean;
  error: string | null;
  
  // Computed
  isPro: boolean;
  isBasic: boolean;
  isFree: boolean;
  hasAddon: (addonId: string) => boolean;
  canUse: (feature: keyof PlanLimits) => boolean;
  getUsagePercent: (feature: string) => number;
  
  // Actions
  refresh: () => Promise<void>;
  upgrade: (priceId: string) => Promise<void>;
  addAddon: (addonId: string) => Promise<void>;
  openPortal: () => Promise<void>;
  recordUsage: (feature: string, qty?: number) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useBilling(): UseBillingResult {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load subscription & usage
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [subData, usageData] = await Promise.all([
        billingApi.getSubscription(),
        billingApi.getUsage(),
      ]);
      
      setSubscription(subData);
      setUsage(usageData);
    } catch (err: any) {
      setError(err.message);
      // Set free defaults
      setSubscription({
        has_subscription: false,
        plan: 'free',
        addons: [],
        limits: {
          leads: 10,
          chats_import: 5,
          ai_analyses: 10,
          follow_ups: 20,
          templates: 5,
          team_members: 1,
          auto_actions: 0,
          ghost_reengages: 0,
          transactions: 0,
          lead_suggestions: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  // Computed values
  const isPro = subscription?.plan?.includes('pro') || subscription?.plan?.includes('unlimited') || false;
  const isBasic = subscription?.plan === 'basic';
  // Default to free if no subscription loaded or has_subscription is false
  const isFree = subscription === null || subscription?.has_subscription === false || subscription?.plan === 'free';
  
  const hasAddon = useCallback((addonId: string): boolean => {
    return subscription?.addons?.includes(addonId) || false;
  }, [subscription]);
  
  const canUse = useCallback((feature: keyof PlanLimits): boolean => {
    if (!subscription?.limits) return false;
    const limit = subscription.limits[feature];
    if (limit === -1) return true; // Unlimited
    if (!usage?.usage) return limit > 0;
    const used = usage.usage[feature] || 0;
    return used < limit;
  }, [subscription, usage]);
  
  const getUsagePercent = useCallback((feature: string): number => {
    return usage?.usage_percentage?.[feature] || 0;
  }, [usage]);
  
  // Actions
  const upgrade = useCallback(async (priceId: string) => {
    try {
      const { checkout_url } = await billingApi.createCheckout(priceId);
      await Linking.openURL(checkout_url);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const addAddon = useCallback(async (addonId: string) => {
    try {
      await billingApi.addAddon(addonId);
      await refresh();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refresh]);
  
  const openPortal = useCallback(async () => {
    try {
      const { portal_url } = await billingApi.createPortalSession();
      await Linking.openURL(portal_url);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const recordUsage = useCallback(async (feature: string, qty: number = 1) => {
    try {
      await billingApi.recordUsage(feature, qty);
    } catch (err) {
      // Silent fail for usage tracking
      console.warn('Failed to record usage:', err);
    }
  }, []);
  
  return {
    subscription,
    usage,
    loading,
    error,
    isPro,
    isBasic,
    isFree,
    hasAddon,
    canUse,
    getUsagePercent,
    refresh,
    upgrade,
    addAddon,
    openPortal,
    recordUsage,
  };
}

export default useBilling;

