/**
 * ============================================
 * 💳 SALESFLOW AI - PRICING PAGE (NEW PLAN STRUCTURE)
 * ============================================
 * Subscription plans with Stripe Checkout integration
 * Uses database-driven plans from /api/usage/plans
 */

import React, { useState, useEffect } from 'react';
import { Check, X, Zap, Crown, Rocket } from 'lucide-react';
import { api } from '../lib/api';

interface Plan {
  id?: string;
  plan_name: string;
  display_name: string;
  price_monthly?: number;
  price_yearly?: number;
  leads_limit: number;
  vision_credits_limit: number;
  voice_minutes_limit: number;
  message_improvements_limit: number;
  freebies_limit: number;
  instagram_dm: boolean;
  power_hour: boolean;
  voice_output: boolean;
  whatsapp: boolean;
  ai_model: string;
  is_active: boolean;
}

const PricingPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState('free');

  useEffect(() => {
    fetchPlans();
    fetchCurrentPlan();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get<{ plans: Plan[] }>('/usage/plans');
      setPlans(response.plans || []);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const response = await api.get<{ plan: string }>('/usage');
      setCurrentPlan(response.plan || 'free');
    } catch (error) {
      console.error('Failed to fetch current plan:', error);
    }
  };

  const handleSubscribe = async (planName: string) => {
    if (planName === 'free' || planName === currentPlan) return;
    
    setCheckoutLoading(planName);
    try {
      const response = await api.post<{ checkout_url: string; session_id: string }>('/billing/create-checkout-session', {
        plan: planName
      });
      if (response.checkout_url) {
        window.location.href = response.checkout_url;
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Fehler beim Erstellen der Checkout-Session');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleAddonPurchase = async (addonName: string) => {
    setCheckoutLoading(addonName);
    try {
      const response = await api.post<{ checkout_url: string; session_id: string }>('/billing/create-checkout-session', {
        addon: addonName
      });
      if (response.checkout_url) {
        window.location.href = response.checkout_url;
      }
    } catch (error) {
      console.error('Addon checkout failed:', error);
      alert('Fehler beim Kaufen des Add-Ons');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const planIcons: Record<string, React.ReactNode> = {
    free: <Zap className="w-8 h-8" />,
    starter: <Zap className="w-8 h-8" />,
    builder: <Rocket className="w-8 h-8" />,
    leader: <Crown className="w-8 h-8" />,
  };

  const planColors: Record<string, string> = {
    free: 'from-gray-500 to-gray-600',
    starter: 'from-blue-500 to-blue-600',
    builder: 'from-purple-500 to-pink-500',
    leader: 'from-yellow-500 to-orange-500',
  };

  const featureList: Array<{
    key: keyof Plan;
    label: string;
    format: (v: number | boolean | string) => string;
  }> = [
    { key: 'leads_limit', label: 'Leads', format: (v) => (v as number) === -1 ? 'Unlimitiert' : String(v) },
    { key: 'vision_credits_limit', label: 'Screen-to-Lead', format: (v) => (v as number) === -1 ? 'Unlimitiert' : (v as number) === 0 ? '—' : `${v}/Monat` },
    { key: 'voice_minutes_limit', label: 'Voice Input', format: (v) => (v as number) === -1 ? 'Unlimitiert' : (v as number) === 0 ? '—' : `${v} Min/Monat` },
    { key: 'message_improvements_limit', label: 'Nachrichten-Verbesserung', format: (v) => (v as number) === -1 ? 'Unlimitiert' : String(v) },
    { key: 'freebies_limit', label: 'Lead Magnets', format: (v) => (v as number) === -1 ? 'Unlimitiert' : (v as number) === 0 ? '—' : String(v) },
    { key: 'instagram_dm', label: 'Instagram DMs', format: (v) => (v as boolean) ? '✓' : '—' },
    { key: 'power_hour', label: 'Power Hour', format: (v) => (v as boolean) ? '✓' : '—' },
    { key: 'voice_output', label: 'Voice Output', format: (v) => (v as boolean) ? '✓' : '—' },
    { key: 'whatsapp', label: 'WhatsApp', format: (v) => (v as boolean) ? '✓' : '—' },
    { key: 'ai_model', label: 'AI Modell', format: (v) => (v as string) === 'gpt-4o' ? 'GPT-4o (Premium)' : (v as string) === 'gpt-4o-mini' ? 'GPT-4o-mini' : 'Standard' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Filter to show only active, paid plans
  const displayPlans = plans.filter(p => p.plan_name !== 'free' && p.is_active);

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Wähle deinen Plan
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Starte kostenlos und upgrade wenn du bereit bist. Alle Pläne mit 14 Tage Geld-zurück-Garantie.
          </p>
        </div>

        {/* Current Plan Badge */}
        {currentPlan !== 'free' && (
          <div className="text-center mb-8">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
              Aktueller Plan: <span className="font-bold ml-1 capitalize">{currentPlan}</span>
          </span>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {displayPlans.map((plan) => {
            const isCurrentPlan = plan.plan_name === currentPlan;
            const isPopular = plan.plan_name === 'builder';

  return (
    <div
                key={plan.id || plan.plan_name}
                className={`relative rounded-2xl p-8 ${
                  isPopular 
                    ? 'bg-gradient-to-b from-purple-900/50 to-gray-800 border-2 border-purple-500 scale-105' 
                    : 'bg-gray-800 border border-gray-700'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                      BELIEBT
          </span>
        </div>
      )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${planColors[plan.plan_name] || planColors.starter} mb-4`}>
                    {planIcons[plan.plan_name] || planIcons.starter}
      </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.display_name || plan.plan_name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">€{plan.price_monthly || 0}</span>
                    <span className="text-gray-400">/Monat</span>
        </div>
      </div>

      {/* Features */}
                <ul className="space-y-3 mb-8">
                  {featureList.map((feature) => {
                    const value = plan[feature.key];
                    const display = feature.format(value as number | boolean | string);
                    const hasFeature = display !== '—';
                    
                    return (
                      <li key={feature.key} className="flex items-center gap-3">
                        {hasFeature ? (
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        )}
                        <span className={hasFeature ? 'text-gray-300' : 'text-gray-600'}>
                          {feature.label}: <span className="font-medium">{display}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>

      {/* CTA Button */}
        <button
                  onClick={() => handleSubscribe(plan.plan_name)}
                  disabled={isCurrentPlan || checkoutLoading === plan.plan_name}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
                    isCurrentPlan
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : isPopular
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                  }`}
                >
                  {checkoutLoading === plan.plan_name ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              Laden...
            </span>
          ) : isCurrentPlan ? (
            'Aktueller Plan'
          ) : (
                    'Jetzt starten'
          )}
        </button>
    </div>
  );
          })}
        </div>

        {/* Add-Ons Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Erweitere deinen Plan mit Add-Ons
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Vision Credits */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-2">Vision Credits</h3>
              <p className="text-gray-400 text-sm mb-4">Mehr Screen-to-Lead Scans</p>
              <div className="space-y-2">
                <button 
                  onClick={() => handleAddonPurchase('vision_50')}
                  disabled={checkoutLoading === 'vision_50'}
                  className="w-full flex justify-between items-center text-gray-300 hover:bg-gray-700 p-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>50 Credits</span>
                  <span className="font-bold text-cyan-400">€9</span>
                </button>
                <button 
                  onClick={() => handleAddonPurchase('vision_150')}
                  disabled={checkoutLoading === 'vision_150'}
                  className="w-full flex justify-between items-center text-gray-300 hover:bg-gray-700 p-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>150 Credits</span>
                  <span className="font-bold text-cyan-400">€19</span>
                </button>
                <button 
                  onClick={() => handleAddonPurchase('vision_500')}
                  disabled={checkoutLoading === 'vision_500'}
                  className="w-full flex justify-between items-center text-gray-300 hover:bg-gray-700 p-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>500 Credits</span>
                  <span className="font-bold text-cyan-400">€49</span>
                </button>
              </div>
            </div>

            {/* Team Seats */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-2">Team Members</h3>
              <p className="text-gray-400 text-sm mb-4">Erweitere dein Team</p>
              <div className="space-y-2">
                <button 
                  onClick={() => handleAddonPurchase('team_1')}
                  disabled={checkoutLoading === 'team_1'}
                  className="w-full flex justify-between items-center text-gray-300 hover:bg-gray-700 p-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>+1 Member</span>
                  <span className="font-bold text-cyan-400">€15/Mo</span>
                </button>
                <button 
                  onClick={() => handleAddonPurchase('team_5')}
                  disabled={checkoutLoading === 'team_5'}
                  className="w-full flex justify-between items-center text-gray-300 hover:bg-gray-700 p-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>+5 Members</span>
                  <span className="font-bold text-cyan-400">€59/Mo</span>
                </button>
                <button 
                  onClick={() => handleAddonPurchase('team_10')}
                  disabled={checkoutLoading === 'team_10'}
                  className="w-full flex justify-between items-center text-gray-300 hover:bg-gray-700 p-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>+10 Members</span>
                  <span className="font-bold text-cyan-400">€99/Mo</span>
                </button>
              </div>
            </div>

            {/* Feature Add-Ons */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-2">Premium Features</h3>
              <p className="text-gray-400 text-sm mb-4">Zusätzliche Power</p>
              <div className="space-y-2">
                <button 
                  onClick={() => handleAddonPurchase('whatsapp')}
                  disabled={checkoutLoading === 'whatsapp'}
                  className="w-full flex justify-between items-center text-gray-300 hover:bg-gray-700 p-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>WhatsApp</span>
                  <span className="font-bold text-cyan-400">€19/Mo</span>
                </button>
                <button 
                  onClick={() => handleAddonPurchase('ghostwriter')}
                  disabled={checkoutLoading === 'ghostwriter'}
                  className="w-full flex justify-between items-center text-gray-300 hover:bg-gray-700 p-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>AI Ghostwriter</span>
                  <span className="font-bold text-cyan-400">€19/Mo</span>
                </button>
                <button 
                  onClick={() => handleAddonPurchase('freebie_pro')}
                  disabled={checkoutLoading === 'freebie_pro'}
                  className="w-full flex justify-between items-center text-gray-300 hover:bg-gray-700 p-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Freebie Pro</span>
                  <span className="font-bold text-cyan-400">€15/Mo</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ or Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-gray-400">
            🔒 Sichere Zahlung über Stripe · 14 Tage Geld-zurück-Garantie · Jederzeit kündbar
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
