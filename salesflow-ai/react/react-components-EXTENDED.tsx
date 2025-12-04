// ====================================================================
// SALES FLOW AI - REACT COMPONENTS (GPT Dashboard Design)
// ====================================================================
// Basierend auf GPT Output: 2-Spalten Layout, Inline Feedback, A/B Testing
// ====================================================================

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ====================================================================
// 1. TEMPLATE PERFORMANCE DASHBOARD (Main Component)
// ====================================================================

export function TemplatePerformanceDashboard() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filters, setFilters] = useState({
    timeframe: '30d',
    company: 'all',
    funnel: 'all',
    channel: 'all',
    language: 'de',
    region: 'DACH',
    onlyTests: false,
    onlyWinners: false
  });

  useEffect(() => {
    loadTemplates();
  }, [filters]);

  async function loadTemplates() {
    let query = supabase
      .from('template_performance')
      .select(`
        *,
        mlm_companies:company_name (name, logo_url)
      `);
    
    // Apply filters
    if (filters.company !== 'all') {
      query = query.eq('company_name', filters.company);
    }
    if (filters.channel !== 'all') {
      query = query.eq('channel', filters.channel);
    }
    if (filters.language !== 'all') {
      query = query.eq('language', filters.language);
    }
    
    // Timeframe
    const days = parseInt(filters.timeframe);
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query = query.gte('period_start', startDate.toISOString());
    }

    const { data, error } = await query;
    if (data) setTemplates(data);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Filter Bar */}
      <FilterBar filters={filters} setFilters={setFilters} />
      
      {/* KPI Cards Row */}
      <KPICardsRow templates={templates} />
      
      {/* Main Content: 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left: Template Table (2/3 width on desktop) */}
        <div className="lg:col-span-2">
          <TemplateTable 
            templates={templates}
            onSelectTemplate={setSelectedTemplate}
            selectedTemplateId={selectedTemplate?.id}
          />
        </div>
        
        {/* Right: Detail Panel (1/3 width on desktop) */}
        <div className="lg:col-span-1">
          {selectedTemplate ? (
            <TemplateDetailPanel template={selectedTemplate} />
          ) : (
            <EmptyDetailState />
          )}
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// 2. FILTER BAR
// ====================================================================

function FilterBar({ filters, setFilters }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Zeitraum */}
        <select
          value={filters.timeframe}
          onChange={(e) => setFilters({ ...filters, timeframe: e.target.value })}
          className="rounded border-gray-300"
        >
          <option value="7d">Letzte 7 Tage</option>
          <option value="30d">Letzte 30 Tage</option>
          <option value="90d">Letzte 90 Tage</option>
          <option value="custom">Custom</option>
        </select>

        {/* Firma */}
        <select
          value={filters.company}
          onChange={(e) => setFilters({ ...filters, company: e.target.value })}
          className="rounded border-gray-300"
        >
          <option value="all">Alle Firmen</option>
          <option value="Zinzino">Zinzino</option>
          <option value="Herbalife">Herbalife</option>
          <option value="PM-International">PM-International</option>
          {/* Dynamisch laden */}
        </select>

        {/* Funnel-Stufe */}
        <select
          value={filters.funnel}
          onChange={(e) => setFilters({ ...filters, funnel: e.target.value })}
          className="rounded border-gray-300"
        >
          <option value="all">Alle Stufen</option>
          <option value="cold">Cold Outreach</option>
          <option value="followup">Follow-up</option>
          <option value="closing">Closing</option>
          <option value="reactivation">Reaktivierung</option>
        </select>

        {/* Channel */}
        <select
          value={filters.channel}
          onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
          className="rounded border-gray-300"
        >
          <option value="all">Alle Channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram DM</option>
          <option value="facebook">Facebook Messenger</option>
          <option value="email">E-Mail</option>
        </select>

        {/* Sprache */}
        <select
          value={filters.language}
          onChange={(e) => setFilters({ ...filters, language: e.target.value })}
          className="rounded border-gray-300"
        >
          <option value="de">🇩🇪 Deutsch</option>
          <option value="en">🇬🇧 English</option>
          <option value="es">🇪🇸 Español</option>
        </select>

        {/* Region */}
        <select
          value={filters.region}
          onChange={(e) => setFilters({ ...filters, region: e.target.value })}
          className="rounded border-gray-300"
        >
          <option value="DACH">DACH</option>
          <option value="Global">Global</option>
        </select>

        {/* Toggles */}
        <div className="flex gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.onlyTests}
              onChange={(e) => setFilters({ ...filters, onlyTests: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Nur A/B Tests</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// 3. KPI CARDS ROW
// ====================================================================

function KPICardsRow({ templates }) {
  const totalSends = templates.reduce((sum, t) => sum + (t.times_sent || 0), 0);
  const avgReplyRate = templates.length > 0 
    ? templates.reduce((sum, t) => sum + (t.response_rate || 0), 0) / templates.length 
    : 0;
  const avgConversion = templates.length > 0
    ? templates.reduce((sum, t) => sum + (t.conversion_rate || 0), 0) / templates.length
    : 0;
  const totalRevenue = templates.reduce((sum, t) => sum + (t.revenue || 0), 0);

  const topTemplate = templates.sort((a, b) => (b.response_rate || 0) - (a.response_rate || 0))[0];
  const warningCount = templates.filter(t => (t.negative_rate || 0) > 15).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Top Template */}
      <KPICard
        title="Top Template (Reply Rate)"
        value={topTemplate ? `${topTemplate.response_rate?.toFixed(1)}%` : 'N/A'}
        subtitle={topTemplate?.template_id || ''}
        trend="+12% vs letzte Woche"
        trendUp={true}
        icon="🏆"
      />

      {/* Beste Closing Quote */}
      <KPICard
        title="Beste Closing-Quote"
        value={`${avgConversion.toFixed(1)}%`}
        subtitle="Sales Conversion"
        trend="+5% vs letzte Woche"
        trendUp={true}
        icon="💰"
      />

      {/* Warnung */}
      <KPICard
        title="Warnung"
        value={warningCount}
        subtitle="Templates mit hoher Negativrate (>15%)"
        buttonText="Ansehen"
        icon="⚠️"
        isWarning={true}
      />

      {/* Traffic / Umsatz */}
      <KPICard
        title="Traffic / Umsatz"
        value={`${totalSends.toLocaleString()} Sends`}
        subtitle={`Revenue: €${totalRevenue.toLocaleString()}`}
        icon="📊"
      />
    </div>
  );
}

function KPICard({ title, value, subtitle, trend, trendUp, buttonText, icon, isWarning }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${isWarning ? 'border-l-4 border-yellow-500' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{subtitle}</div>
      {trend && (
        <div className={`text-sm mt-2 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </div>
      )}
      {buttonText && (
        <button className="mt-3 text-sm text-blue-600 hover:text-blue-800">
          {buttonText} →
        </button>
      )}
    </div>
  );
}

// ====================================================================
// 4. TEMPLATE TABLE
// ====================================================================

function TemplateTable({ templates, onSelectTemplate, selectedTemplateId }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Template
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sends
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reply %
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Positive %
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Appointment %
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sales Conv %
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map((template) => (
              <tr
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedTemplateId === template.id ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {template.template_id}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <Badge text={template.company_name} color="blue" />
                        <Badge text={template.channel} color="gray" />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {template.times_sent || 0}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {template.response_rate?.toFixed(1) || 0}%
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {template.positive_rate?.toFixed(1) || 0}%
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {template.appointment_rate?.toFixed(1) || 0}%
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {template.conversion_rate?.toFixed(1) || 0}%
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={template.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ text, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800'
  };
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[color]}`}>
      {text}
    </span>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    testing: { color: 'yellow', label: 'Testing' },
    winner: { color: 'green', label: 'Winner' },
    paused: { color: 'gray', label: 'Paused' },
    active: { color: 'blue', label: 'Active' }
  };
  
  const config = statusConfig[status] || statusConfig.active;
  
  return <Badge text={config.label} color={config.color} />;
}

// ====================================================================
// 5. TEMPLATE DETAIL PANEL
// ====================================================================

function TemplateDetailPanel({ template }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {template.template_id}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Badge text={template.company_name} color="blue" />
          <Badge text={template.channel} color="gray" />
          <Badge text={template.language} color="gray" />
          <StatusBadge status={template.status} />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Summary KPIs</h3>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Sends" value={template.times_sent || 0} />
          <MetricCard label="Reply Rate" value={`${template.response_rate?.toFixed(1) || 0}%`} />
          <MetricCard label="Positive %" value={`${template.positive_rate?.toFixed(1) || 0}%`} />
          <MetricCard label="Sales Conv" value={`${template.conversion_rate?.toFixed(1) || 0}%`} />
        </div>
      </div>

      {/* Funnel Mini-Visualization */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Funnel</h3>
        <FunnelViz
          sends={template.times_sent}
          replies={template.times_replied}
          appointments={template.times_appointment}
          sales={template.times_converted}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Template bearbeiten
        </button>
        <button className="flex-1 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50">
          Duplizieren
        </button>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded p-3">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function FunnelViz({ sends, replies, appointments, sales }) {
  const stages = [
    { label: 'Sends', value: sends, width: 100 },
    { label: 'Replies', value: replies, width: replies / sends * 100 },
    { label: 'Appointments', value: appointments, width: appointments / sends * 100 },
    { label: 'Sales', value: sales, width: sales / sends * 100 }
  ];

  return (
    <div className="space-y-2">
      {stages.map((stage) => (
        <div key={stage.label}>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{stage.label}</span>
            <span>{stage.value}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${stage.width}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyDetailState() {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <div className="text-6xl mb-4">📊</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Wähle ein Template
      </h3>
      <p className="text-gray-600">
        Klicke auf ein Template in der Tabelle um Details zu sehen
      </p>
    </div>
  );
}

// ====================================================================
// 6. INLINE FEEDBACK WIDGET (MAX 2 CLICKS!)
// ====================================================================

export function InlineFeedbackWidget({ contactId, templateId, onFeedbackSubmitted }) {
  const [step, setStep] = useState(1);
  const [reaction, setReaction] = useState(null);
  const [objection, setObjection] = useState(null);

  async function submitFeedback() {
    // Save to Supabase
    await supabase.from('template_feedback').insert({
      contact_id: contactId,
      template_id: templateId,
      reaction: reaction,
      objection: objection,
      timestamp: new Date().toISOString()
    });

    // Update template_performance
    await supabase.rpc('increment_template_reaction', {
      p_template_id: templateId,
      p_reaction_type: reaction
    });

    onFeedbackSubmitted();
  }

  if (step === 1) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm border-2 border-blue-500">
        <h3 className="font-medium text-gray-900 mb-3">
          Wie hat der Kontakt reagiert?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setReaction('positive'); setStep(2); }}
            className="p-3 border-2 border-green-500 rounded hover:bg-green-50 transition"
          >
            <div className="text-2xl mb-1">👍</div>
            <div className="text-sm font-medium">Offen/interessiert</div>
          </button>
          <button
            onClick={() => { setReaction('neutral'); submitFeedback(); }}
            className="p-3 border-2 border-gray-300 rounded hover:bg-gray-50 transition"
          >
            <div className="text-2xl mb-1">😐</div>
            <div className="text-sm font-medium">Neutral</div>
          </button>
          <button
            onClick={() => { setReaction('negative'); setStep(2); }}
            className="p-3 border-2 border-red-500 rounded hover:bg-red-50 transition"
          >
            <div className="text-2xl mb-1">👎</div>
            <div className="text-sm font-medium">Ablehnend</div>
          </button>
          <button
            onClick={() => { setReaction('no_response'); submitFeedback(); }}
            className="p-3 border-2 border-gray-300 rounded hover:bg-gray-50 transition"
          >
            <div className="text-2xl mb-1">🕐</div>
            <div className="text-sm font-medium">Keine Antwort</div>
          </button>
        </div>
        <button
          onClick={() => onFeedbackSubmitted()}
          className="mt-3 text-sm text-gray-500 hover:text-gray-700 w-full"
        >
          Später ↓
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm border-2 border-blue-500">
        <h3 className="font-medium text-gray-900 mb-3">
          Was war der Hauptpunkt?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {['Preis', 'Keine Zeit', 'Kein Bedarf', 'Schon in Network', 'Falsche Person'].map((obj) => (
            <button
              key={obj}
              onClick={() => { setObjection(obj); submitFeedback(); }}
              className="p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              {obj}
            </button>
          ))}
        </div>
        <button
          onClick={() => submitFeedback()}
          className="mt-3 text-sm text-gray-500 hover:text-gray-700 w-full"
          >
          Überspringen →
        </button>
      </div>
    );
  }

  return null;
}

// ====================================================================
// 7. A/B TEST MANAGER
// ====================================================================

export function ABTestManager() {
  const [activeTests, setActiveTests] = useState([]);

  useEffect(() => {
    loadActiveTests();
  }, []);

  async function loadActiveTests() {
    const { data } = await supabase
      .from('template_ab_tests')
      .select(`
        *,
        variant_a:template_performance!variant_a_id(*),
        variant_b:template_performance!variant_b_id(*)
      `)
      .eq('status', 'active');
    
    setActiveTests(data || []);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Aktive A/B Tests</h2>
      
      <div className="space-y-4">
        {activeTests.map((test) => (
          <ABTestCard key={test.id} test={test} />
        ))}
      </div>
    </div>
  );
}

function ABTestCard({ test }) {
  const variantA = test.variant_a;
  const variantB = test.variant_b;
  
  const primaryMetric = test.primary_metric || 'response_rate';
  const metricA = variantA[primaryMetric] || 0;
  const metricB = variantB[primaryMetric] || 0;
  
  const lift = metricA > 0 ? ((metricB - metricA) / metricA) * 100 : 0;
  const isSignificant = Math.abs(lift) >= 20;
  const winner = lift > 0 ? 'B' : 'A';

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{test.test_name}</h3>
          <p className="text-sm text-gray-600">
            Primary Metric: {primaryMetric.replace('_', ' ')}
          </p>
        </div>
        {isSignificant && (
          <Badge text={`Winner: ${winner}`} color="green" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-600 mb-1">Variante A</div>
          <div className="text-lg font-semibold">{metricA.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">{variantA.times_sent} Sends</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Variante B</div>
          <div className="text-lg font-semibold">{metricB.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">{variantB.times_sent} Sends</div>
        </div>
      </div>

      <div className={`text-sm mb-3 ${lift > 0 ? 'text-green-600' : 'text-red-600'}`}>
        {lift > 0 ? '+' : ''}{lift.toFixed(1)}% Lift
      </div>

      {isSignificant && (
        <div className="flex gap-2">
          <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700">
            ✓ {winner} als Standard setzen
          </button>
          <button className="flex-1 border border-gray-300 px-3 py-2 rounded text-sm hover:bg-gray-50">
            ⏱ Weiter testen
          </button>
        </div>
      )}
    </div>
  );
}

// ====================================================================
// EXPORTS
// ====================================================================

export default TemplatePerformanceDashboard;
