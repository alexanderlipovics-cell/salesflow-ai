/**
 * ============================================
 * 💳 SALESFLOW AI - BILLING MANAGEMENT
 * ============================================
 * Subscription management dashboard
 * 
 * Features:
 * - Current plan overview
 * - Usage tracking
 * - Payment methods management
 * - Invoice history
 * - Plan upgrade/downgrade
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
interface Subscription {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  plan: 'starter' | 'pro' | 'enterprise';
  interval: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_end?: string;
  features: {
    leads_limit: number;
    users_limit: number;
    ai_credits: number;
    integrations: string[];
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
}

interface Invoice {
  id: string;
  status: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: string;
  invoice_pdf?: string;
}

interface UsageData {
  leads_used: number;
  leads_limit: number;
  ai_credits_used: number;
  ai_credits_limit: number;
  users_count: number;
  users_limit: number;
}

// Token helper
const getToken = () => localStorage.getItem('access_token');

// API functions
const api = {
  async getSubscription(): Promise<Subscription | null> {
    const res = await fetch('/api/billing/subscriptions/current', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) return null;
    return res.json();
  },

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const res = await fetch('/api/billing/payment-methods', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getInvoices(): Promise<Invoice[]> {
    const res = await fetch('/api/billing/invoices?limit=5', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const res = await fetch(`/api/billing/subscriptions/${subscriptionId}?immediately=false`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error('Failed to cancel subscription');
  },

  async reactivateSubscription(subscriptionId: string): Promise<void> {
    const res = await fetch(`/api/billing/subscriptions/${subscriptionId}/reactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error('Failed to reactivate subscription');
  },

  async createBillingPortal(): Promise<string> {
    const res = await fetch('/api/billing/billing-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        return_url: window.location.href,
      }),
    });
    if (!res.ok) throw new Error('Failed to create billing portal session');
    const { portal_url } = await res.json();
    return portal_url;
  },

  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    const res = await fetch(`/api/billing/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error('Failed to remove payment method');
  },
};

// Icons
const CreditCardIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    trialing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    past_due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    canceled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    unpaid: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  const labels: Record<string, string> = {
    active: 'Aktiv',
    trialing: 'Testphase',
    past_due: 'Zahlung ausstehend',
    canceled: 'Gekündigt',
    unpaid: 'Unbezahlt',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.active}`}>
      {labels[status] || status}
    </span>
  );
};

// Usage progress bar
const UsageBar: React.FC<{ used: number; limit: number; label: string }> = ({ used, limit, label }) => {
  const percentage = limit === -1 ? 0 : Math.min(100, (used / limit) * 100);
  const isUnlimited = limit === -1;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {used.toLocaleString('de-DE')} / {isUnlimited ? '∞' : limit.toLocaleString('de-DE')}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${isUnlimited ? 0 : percentage}%` }}
        />
      </div>
    </div>
  );
};

// Payment method card
const PaymentMethodCard: React.FC<{
  method: PaymentMethod;
  onRemove: () => void;
  isRemoving: boolean;
}> = ({ method, onRemove, isRemoving }) => {
  const brandIcons: Record<string, string> = {
    visa: '💳 Visa',
    mastercard: '💳 Mastercard',
    amex: '💳 Amex',
    discover: '💳 Discover',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="text-2xl">{brandIcons[method.card?.brand || ''] || '💳'}</div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            •••• {method.card?.last4}
            {method.is_default && (
              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Standard)</span>
            )}
          </p>
          <p className="text-sm text-gray-500">
            Läuft ab {method.card?.exp_month}/{method.card?.exp_year}
          </p>
        </div>
      </div>
      <button
        onClick={onRemove}
        disabled={isRemoving || method.is_default}
        className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRemoving ? 'Entfernen...' : 'Entfernen'}
      </button>
    </div>
  );
};

// Invoice row
const InvoiceRow: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
  const statusColors: Record<string, string> = {
    paid: 'text-green-600',
    open: 'text-yellow-600',
    void: 'text-gray-600',
    uncollectible: 'text-red-600',
  };

  return (
    <tr className="border-b dark:border-gray-700">
      <td className="py-3 text-sm text-gray-900 dark:text-white">
        {new Date(invoice.created).toLocaleDateString('de-DE')}
      </td>
      <td className="py-3 text-sm">
        <span className={statusColors[invoice.status] || 'text-gray-600'}>
          {invoice.status === 'paid' ? 'Bezahlt' : invoice.status}
        </span>
      </td>
      <td className="py-3 text-sm text-gray-900 dark:text-white text-right">
        €{invoice.amount_paid.toFixed(2)}
      </td>
      <td className="py-3 text-sm text-right">
        {invoice.invoice_pdf && (
          <a
            href={invoice.invoice_pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700"
          >
            PDF
          </a>
        )}
      </td>
    </tr>
  );
};

// Main component
const BillingManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'payment' | 'invoices'>('overview');

  // Queries
  const { data: subscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: api.getSubscription,
  });

  const { data: paymentMethods = [], isLoading: loadingPaymentMethods } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: api.getPaymentMethods,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: api.getInvoices,
  });

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: api.cancelSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });

  const reactivateMutation = useMutation({
    mutationFn: api.reactivateSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });

  const [removingPaymentMethod, setRemovingPaymentMethod] = useState<string | null>(null);

  const handleRemovePaymentMethod = async (id: string) => {
    setRemovingPaymentMethod(id);
    try {
      await api.removePaymentMethod(id);
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    } finally {
      setRemovingPaymentMethod(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const url = await api.createBillingPortal();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  // Mock usage data (would come from API)
  const usage: UsageData = {
    leads_used: 342,
    leads_limit: subscription?.features.leads_limit || 500,
    ai_credits_used: 67,
    ai_credits_limit: subscription?.features.ai_credits || 100,
    users_count: 1,
    users_limit: subscription?.features.users_limit || 1,
  };

  const planNames: Record<string, string> = {
    starter: 'Starter',
    pro: 'Professional',
    enterprise: 'Enterprise',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Abrechnung & Abonnement</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Verwalte dein Abonnement, Zahlungsmethoden und Rechnungen
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Übersicht', icon: ChartIcon },
              { id: 'payment', label: 'Zahlung', icon: CreditCardIcon },
              { id: 'invoices', label: 'Rechnungen', icon: DocumentIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Aktueller Plan
                  </h2>
                  {subscription ? (
                    <div className="mt-2">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {planNames[subscription.plan]}
                      </p>
                      <div className="mt-2 flex items-center space-x-3">
                        <StatusBadge status={subscription.status} />
                        <span className="text-sm text-gray-500">
                          {subscription.interval === 'yearly' ? 'Jährlich' : 'Monatlich'}
                        </span>
                      </div>
                      {subscription.cancel_at_period_end && (
                        <p className="mt-2 text-sm text-red-600">
                          Wird am {new Date(subscription.current_period_end).toLocaleDateString('de-DE')} gekündigt
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Kein aktives Abonnement</p>
                  )}
                </div>
                <div className="flex space-x-3">
                  {subscription?.cancel_at_period_end ? (
                    <button
                      onClick={() => reactivateMutation.mutate(subscription.id)}
                      disabled={reactivateMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {reactivateMutation.isPending ? 'Laden...' : 'Reaktivieren'}
                    </button>
                  ) : subscription ? (
                    <>
                      <button
                        onClick={handleManageBilling}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Plan ändern
                      </button>
                      <button
                        onClick={() => cancelMutation.mutate(subscription.id)}
                        disabled={cancelMutation.isPending}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                      >
                        {cancelMutation.isPending ? 'Laden...' : 'Kündigen'}
                      </button>
                    </>
                  ) : (
                    <a
                      href="/pricing"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Plan auswählen
                    </a>
                  )}
                </div>
              </div>

              {/* Billing period */}
              {subscription && (
                <div className="mt-6 pt-6 border-t dark:border-gray-700">
                  <p className="text-sm text-gray-500">
                    Abrechnungszeitraum:{' '}
                    {new Date(subscription.current_period_start).toLocaleDateString('de-DE')} -{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString('de-DE')}
                  </p>
                </div>
              )}
            </div>

            {/* Usage Card */}
            {subscription && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Nutzung in diesem Zeitraum
                </h2>
                <div className="space-y-6">
                  <UsageBar used={usage.leads_used} limit={usage.leads_limit} label="Leads" />
                  <UsageBar used={usage.ai_credits_used} limit={usage.ai_credits_limit} label="AI Credits" />
                  <UsageBar used={usage.users_count} limit={usage.users_limit} label="Team-Mitglieder" />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="space-y-6">
            {/* Payment Methods */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Zahlungsmethoden
                </h2>
                <button
                  onClick={handleManageBilling}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Karte hinzufügen
                </button>
              </div>

              {loadingPaymentMethods ? (
                <p className="text-gray-500">Laden...</p>
              ) : paymentMethods.length === 0 ? (
                <p className="text-gray-500">Keine Zahlungsmethoden hinterlegt</p>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      onRemove={() => handleRemovePaymentMethod(method.id)}
                      isRemoving={removingPaymentMethod === method.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rechnungshistorie
              </h2>
            </div>

            {loadingInvoices ? (
              <div className="p-6">
                <p className="text-gray-500">Laden...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-6">
                <p className="text-gray-500">Keine Rechnungen vorhanden</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Betrag
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      PDF
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {invoices.map((invoice) => (
                    <InvoiceRow key={invoice.id} invoice={invoice} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingManagement;
