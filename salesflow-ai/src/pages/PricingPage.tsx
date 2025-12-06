/**
 * ============================================
 * 💳 SALESFLOW AI - PRICING PAGE
 * ============================================
 * Subscription plans with Stripe Checkout integration
 * 
 * Features:
 * - Plan comparison
 * - Monthly/Yearly toggle
 * - Feature highlights
 * - Stripe Checkout integration
 * - Mobile responsive
 */

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// Types
interface PlanFeatures {
  leads_limit: number;
  users_limit: number;
  ai_credits: number;
  integrations: string[];
  support: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: PlanFeatures;
  popular: boolean;
}

interface PricingPageProps {
  currentPlan?: string;
  onSelectPlan?: (planId: string, interval: 'monthly' | 'yearly') => void;
}

// Stripe initialization
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Plan data
const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfekt für Einzelunternehmer und kleine Teams',
    price_monthly: 29,
    price_yearly: 290,
    features: {
      leads_limit: 500,
      users_limit: 1,
      ai_credits: 100,
      integrations: ['Facebook'],
      support: 'E-Mail Support',
    },
    popular: false,
  },
  {
    id: 'pro',
    name: 'Professional',
    description: 'Ideal für wachsende Unternehmen',
    price_monthly: 79,
    price_yearly: 790,
    features: {
      leads_limit: 5000,
      users_limit: 5,
      ai_credits: 1000,
      integrations: ['Facebook', 'Instagram', 'LinkedIn'],
      support: 'Priority Support',
    },
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Für große Teams mit individuellen Anforderungen',
    price_monthly: 199,
    price_yearly: 1990,
    features: {
      leads_limit: -1,
      users_limit: -1,
      ai_credits: -1,
      integrations: ['Facebook', 'Instagram', 'LinkedIn', 'Custom API'],
      support: 'Dedicated Account Manager',
    },
    popular: false,
  },
];

// Icons as inline SVGs
const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

// Feature list component
const FeatureList: React.FC<{ features: PlanFeatures }> = ({ features }) => {
  const formatLimit = (value: number): string => {
    if (value === -1) return 'Unbegrenzt';
    return value.toLocaleString('de-DE');
  };

  const featureItems = [
    { label: 'Leads', value: formatLimit(features.leads_limit) },
    { label: 'Team-Mitglieder', value: formatLimit(features.users_limit) },
    { label: 'AI Credits/Monat', value: formatLimit(features.ai_credits) },
    { label: 'Integrationen', value: features.integrations.join(', ') },
    { label: 'Support', value: features.support },
  ];

  return (
    <ul className="mt-6 space-y-4">
      {featureItems.map((item, index) => (
        <li key={index} className="flex items-start">
          <CheckIcon />
          <span className="ml-3 text-gray-600 dark:text-gray-300">
            <strong>{item.label}:</strong> {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
};

// Plan card component
const PlanCard: React.FC<{
  plan: Plan;
  isYearly: boolean;
  isCurrentPlan: boolean;
  onSelect: () => void;
  isLoading: boolean;
}> = ({ plan, isYearly, isCurrentPlan, onSelect, isLoading }) => {
  const price = isYearly ? plan.price_yearly : plan.price_monthly;
  const monthlyPrice = isYearly ? Math.round(plan.price_yearly / 12) : plan.price_monthly;
  const savings = isYearly ? Math.round((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12) * 100) : 0;

  return (
    <div
      className={`
        relative rounded-2xl p-8 
        ${plan.popular 
          ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-xl scale-105 z-10' 
          : 'bg-white dark:bg-gray-800 shadow-lg'
        }
        transition-all duration-300 hover:shadow-xl
      `}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-yellow-400 text-yellow-900">
            <StarIcon />
            <span className="ml-1">Beliebteste Wahl</span>
          </span>
        </div>
      )}

      {/* Plan header */}
      <div className="text-center">
        <h3 className={`text-2xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          {plan.name}
        </h3>
        <p className={`mt-2 text-sm ${plan.popular ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
          {plan.description}
        </p>
      </div>

      {/* Pricing */}
      <div className="mt-6 text-center">
        <div className="flex items-baseline justify-center">
          <span className={`text-5xl font-extrabold ${plan.popular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            €{monthlyPrice}
          </span>
          <span className={`ml-2 ${plan.popular ? 'text-blue-100' : 'text-gray-500'}`}>
            /Monat
          </span>
        </div>
        {isYearly && (
          <p className={`mt-2 text-sm ${plan.popular ? 'text-blue-100' : 'text-green-600'}`}>
            Spare {savings}% mit jährlicher Zahlung (€{price}/Jahr)
          </p>
        )}
      </div>

      {/* Features */}
      <div className={plan.popular ? 'text-blue-50' : ''}>
        <FeatureList features={plan.features} />
      </div>

      {/* CTA Button */}
      <div className="mt-8">
        <button
          onClick={onSelect}
          disabled={isLoading || isCurrentPlan}
          className={`
            w-full py-3 px-6 rounded-lg font-semibold text-center
            transition-all duration-200
            ${isCurrentPlan
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : plan.popular
                ? 'bg-white text-blue-600 hover:bg-blue-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }
            ${isLoading ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Laden...
            </span>
          ) : isCurrentPlan ? (
            'Aktueller Plan'
          ) : (
            'Plan auswählen'
          )}
        </button>
      </div>
    </div>
  );
};

// Main pricing page component
const PricingPage: React.FC<PricingPageProps> = ({ currentPlan, onSelectPlan }) => {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    setLoadingPlan(planId);
    setError(null);

    try {
      // Create checkout session
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          plan: planId,
          interval: isYearly ? 'yearly' : 'monthly',
          success_url: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/pricing`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { checkout_url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = checkout_url;

    } catch (err) {
      setError('Fehler beim Erstellen der Checkout-Session. Bitte versuche es erneut.');
      console.error('Checkout error:', err);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
            Einfache, transparente Preise
          </h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
            Wähle den Plan, der zu deinem Business passt
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-8 flex justify-center">
          <div className="relative bg-gray-200 dark:bg-gray-700 rounded-full p-1 flex">
            <button
              onClick={() => setIsYearly(false)}
              className={`
                px-6 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${!isYearly 
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow' 
                  : 'text-gray-600 dark:text-gray-300'
                }
              `}
            >
              Monatlich
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`
                px-6 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${isYearly 
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow' 
                  : 'text-gray-600 dark:text-gray-300'
                }
              `}
            >
              Jährlich
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Spare bis zu 17%
              </span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-6 items-center">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              isCurrentPlan={currentPlan === plan.id}
              onSelect={() => handleSelectPlan(plan.id)}
              isLoading={loadingPlan === plan.id}
            />
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Vertrauen von über 1.000+ Unternehmen
          </p>
          <div className="flex justify-center items-center space-x-8 opacity-50">
            <span className="text-2xl font-bold text-gray-400">Company 1</span>
            <span className="text-2xl font-bold text-gray-400">Company 2</span>
            <span className="text-2xl font-bold text-gray-400">Company 3</span>
            <span className="text-2xl font-bold text-gray-400">Company 4</span>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Häufig gestellte Fragen
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <FAQItem 
              question="Kann ich meinen Plan jederzeit ändern?"
              answer="Ja, du kannst jederzeit upgraden oder downgraden. Bei einem Upgrade werden die Kosten anteilig berechnet."
            />
            <FAQItem 
              question="Gibt es eine kostenlose Testphase?"
              answer="Ja! Alle Pläne beinhalten eine 14-tägige kostenlose Testphase. Keine Kreditkarte erforderlich."
            />
            <FAQItem 
              question="Was passiert, wenn ich mein Lead-Limit erreiche?"
              answer="Du erhältst eine Benachrichtigung bei 80% und 100%. Du kannst jederzeit upgraden oder zusätzliche Leads kaufen."
            />
            <FAQItem 
              question="Wie kann ich kündigen?"
              answer="Du kannst jederzeit in den Einstellungen kündigen. Dein Zugang bleibt bis zum Ende der Abrechnungsperiode aktiv."
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-blue-600 rounded-2xl p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Bereit durchzustarten?
            </h2>
            <p className="mt-4 text-blue-100 max-w-2xl mx-auto">
              Starte heute mit deiner 14-tägigen kostenlosen Testphase. Keine Kreditkarte erforderlich.
            </p>
            <button
              onClick={() => handleSelectPlan('pro')}
              className="mt-8 inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-blue-600 bg-white hover:bg-blue-50 transition-colors"
            >
              Kostenlos testen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// FAQ Item component
const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex justify-between items-center"
      >
        <span className="font-medium text-gray-900 dark:text-white">{question}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-gray-600 dark:text-gray-300">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
