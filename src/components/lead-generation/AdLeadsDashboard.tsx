/**
 * Ad Leads Dashboard Component
 * 
 * Zeigt alle Leads von Ad-Plattformen:
 * - Facebook Lead Ads
 * - LinkedIn Lead Gen Forms
 * - Instagram Lead Ads
 * - Web Forms
 * 
 * @author SalesFlow AI
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '../ui/card';

// Types
interface AdLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: 'facebook_lead_ads' | 'linkedin_lead_gen' | 'instagram_lead_ads' | 'web_form';
  campaign?: string;
  created_at: string;
  status: string;
  temperature: number;
}

interface WebhookStatus {
  configured: boolean;
  webhook_url: string;
  page_id?: string;
  note?: string;
  status?: string;
}

interface PlatformStats {
  total: number;
  today: number;
  thisWeek: number;
  conversionRate: number;
}

// Platform Icons
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className = "w-5 h-5" }) => {
  const icons: Record<string, JSX.Element> = {
    facebook_lead_ads: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    linkedin_lead_gen: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    instagram_lead_ads: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
      </svg>
    ),
    web_form: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  };
  
  return icons[platform] || icons.web_form;
};

// Platform Colors
const platformColors: Record<string, string> = {
  facebook_lead_ads: 'bg-blue-500',
  linkedin_lead_gen: 'bg-blue-700',
  instagram_lead_ads: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
  web_form: 'bg-gray-600',
};

const platformNames: Record<string, string> = {
  facebook_lead_ads: 'Facebook',
  linkedin_lead_gen: 'LinkedIn',
  instagram_lead_ads: 'Instagram',
  web_form: 'Web Form',
};

// Stats Card Component
const StatsCard: React.FC<{
  platform: string;
  stats: PlatformStats;
  status: WebhookStatus;
}> = ({ platform, stats, status }) => (
  <Card className="relative overflow-hidden">
    <div className={`absolute top-0 left-0 w-1 h-full ${platformColors[platform]}`} />
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${platformColors[platform]} text-white`}>
            <PlatformIcon platform={platform} />
          </div>
          <CardTitle className="text-lg">{platformNames[platform]}</CardTitle>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${status.configured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {status.configured ? '✓ Aktiv' : '⚠ Setup nötig'}
        </span>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-500">Gesamt</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">+{stats.today}</p>
          <p className="text-sm text-gray-500">Heute</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{stats.thisWeek}</p>
          <p className="text-sm text-gray-500">Diese Woche</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{stats.conversionRate}%</p>
          <p className="text-sm text-gray-500">Conversion</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Lead Row Component
const LeadRow: React.FC<{ lead: AdLead }> = ({ lead }) => (
  <tr className="border-b hover:bg-gray-50 transition-colors">
    <td className="py-3 px-4">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded ${platformColors[lead.source]} text-white`}>
          <PlatformIcon platform={lead.source} className="w-4 h-4" />
        </div>
        <span className="text-sm">{platformNames[lead.source]}</span>
      </div>
    </td>
    <td className="py-3 px-4">
      <div>
        <p className="font-medium">{lead.name}</p>
        <p className="text-sm text-gray-500">{lead.email}</p>
      </div>
    </td>
    <td className="py-3 px-4">
      <p className="text-sm">{lead.company || '-'}</p>
    </td>
    <td className="py-3 px-4">
      <p className="text-sm">{lead.campaign || '-'}</p>
    </td>
    <td className="py-3 px-4">
      <span className={`px-2 py-1 rounded-full text-xs ${
        lead.temperature >= 80 ? 'bg-red-100 text-red-800' :
        lead.temperature >= 50 ? 'bg-yellow-100 text-yellow-800' :
        'bg-blue-100 text-blue-800'
      }`}>
        {lead.temperature >= 80 ? '🔥 Hot' : lead.temperature >= 50 ? '🟠 Warm' : '🟢 Kalt'}
      </span>
    </td>
    <td className="py-3 px-4">
      <p className="text-sm text-gray-500">
        {new Date(lead.created_at).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </td>
    <td className="py-3 px-4">
      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
        Öffnen →
      </button>
    </td>
  </tr>
);

// Main Dashboard Component
export const AdLeadsDashboard: React.FC = () => {
  const [webhookStatus, setWebhookStatus] = useState<Record<string, WebhookStatus>>({});
  const [leads, setLeads] = useState<AdLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, PlatformStats>>({
    facebook_lead_ads: { total: 0, today: 0, thisWeek: 0, conversionRate: 0 },
    linkedin_lead_gen: { total: 0, today: 0, thisWeek: 0, conversionRate: 0 },
    instagram_lead_ads: { total: 0, today: 0, thisWeek: 0, conversionRate: 0 },
    web_form: { total: 0, today: 0, thisWeek: 0, conversionRate: 0 },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch webhook status
      const statusRes = await fetch('/api/webhooks/ads/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setWebhookStatus(statusData.webhooks || {});
      }

      // Fetch leads (mock for now - replace with actual API)
      // const leadsRes = await fetch('/api/leads?source=ad_platforms');
      
      // Demo data
      setLeads([
        {
          id: '1',
          name: 'Julia Fischer',
          email: 'julia@example.com',
          phone: '+49 170 1234567',
          company: 'Self-Employed',
          source: 'facebook_lead_ads',
          campaign: 'Mama Business 2024',
          created_at: new Date().toISOString(),
          status: 'NEW',
          temperature: 85,
        },
        {
          id: '2',
          name: 'Thomas Müller',
          email: 'thomas.m@company.de',
          company: 'Müller GmbH',
          source: 'linkedin_lead_gen',
          campaign: 'B2B Network Q1',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          status: 'NEW',
          temperature: 70,
        },
        {
          id: '3',
          name: 'Sarah Weber',
          email: 'sarah.w@mail.de',
          source: 'instagram_lead_ads',
          campaign: 'Lifestyle Freedom',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          status: 'CONTACTED',
          temperature: 60,
        },
        {
          id: '4',
          name: 'Max Mustermann',
          email: 'max@test.de',
          phone: '+49 171 9876543',
          source: 'web_form',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'NEW',
          temperature: 75,
        },
      ]);

      // Demo stats
      setStats({
        facebook_lead_ads: { total: 127, today: 5, thisWeek: 23, conversionRate: 12 },
        linkedin_lead_gen: { total: 45, today: 2, thisWeek: 8, conversionRate: 18 },
        instagram_lead_ads: { total: 89, today: 3, thisWeek: 15, conversionRate: 9 },
        web_form: { total: 234, today: 8, thisWeek: 42, conversionRate: 15 },
      });

    } catch (error) {
      console.error('Error fetching ad leads data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Leads Dashboard</h1>
          <p className="text-gray-500">Leads von Facebook, LinkedIn, Instagram & Web Forms</p>
        </div>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 Aktualisieren
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(stats).map(([platform, platformStats]) => (
          <StatsCard
            key={platform}
            platform={platform}
            stats={platformStats}
            status={webhookStatus[platform] || { configured: false, webhook_url: '' }}
          />
        ))}
      </div>

      {/* Setup Hinweise */}
      {Object.values(webhookStatus).some(s => !s.configured) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              ⚠️ Setup erforderlich
            </CardTitle>
            <CardDescription className="text-yellow-700">
              Einige Plattformen sind noch nicht konfiguriert. Folge der Setup-Anleitung um alle Leads zu empfangen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a 
              href="/docs/ad-leads-setup" 
              className="text-yellow-800 underline hover:text-yellow-900"
            >
              📚 Setup-Anleitung öffnen →
            </a>
          </CardContent>
        </Card>
      )}

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Neueste Leads</CardTitle>
          <CardDescription>
            Alle Leads von Ad-Plattformen der letzten 7 Tage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Quelle</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Kontakt</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Firma</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Kampagne</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Temperatur</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Datum</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} />
                ))}
              </tbody>
            </table>
          </div>
          
          {leads.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Noch keine Leads</p>
              <p className="text-sm">Sobald Leads von deinen Ads eingehen, erscheinen sie hier.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook URLs Info */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook URLs</CardTitle>
          <CardDescription>
            Diese URLs in deinen Ad-Plattformen konfigurieren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(webhookStatus).map(([platform, status]) => (
              <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${platformColors[platform]} text-white`}>
                    <PlatformIcon platform={platform} className="w-4 h-4" />
                  </div>
                  <span className="font-medium">{platformNames[platform]}</span>
                </div>
                <code className="bg-gray-200 px-3 py-1 rounded text-sm">
                  {`${window.location.origin}/api${status.webhook_url}`}
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdLeadsDashboard;

