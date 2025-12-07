import React, { useState } from 'react';
import { 
  Users, TrendingUp, DollarSign, Clock, AlertCircle, ChevronDown, ChevronUp, BrainCircuit, RefreshCw
} from 'lucide-react';

// --- TYPES (Matching API) ---

interface BantData {
  budget: number;
  authority: number;
  need: number;
  timeline: number;
}

interface LeadAnalysis {
  lead_id: string;
  name: string; // From basic lead data
  bant_score: number;
  bant_breakdown: BantData;
  linkedin_data: {
    position: string;
    company: string;
    company_size: string;
    industry: string;
  };
  purchase_signals: Array<{ type: string; confidence: number; context: string }>;
  recommendation: {
    priority: 'high' | 'medium' | 'low';
    reason: string;
    suggested_questions: string[];
  };
  status: 'qualified' | 'pending';
}

// --- MOCK DATA ---

const MOCK_LEADS: LeadAnalysis[] = [
  {
    lead_id: '1',
    name: 'Sarah Connor',
    bant_score: 82,
    bant_breakdown: { budget: 70, authority: 90, need: 85, timeline: 60 },
    linkedin_data: { position: 'CTO', company: 'Skynet Inc', company_size: '1000+', industry: 'AI Defense' },
    purchase_signals: [
      { type: 'Funding', confidence: 95, context: 'Received $50M Series C' },
      { type: 'Hiring', confidence: 80, context: 'Hiring 5 Senior Devs' }
    ],
    recommendation: { priority: 'high', reason: 'Hohes Budget und dringender Need.', suggested_questions: ['Wann soll das System live gehen?'] },
    status: 'qualified'
  },
  {
    lead_id: '2',
    name: 'John Doe',
    bant_score: 0,
    bant_breakdown: { budget: 0, authority: 0, need: 0, timeline: 0 },
    linkedin_data: { position: '', company: 'Unknown', company_size: '', industry: '' },
    purchase_signals: [],
    recommendation: { priority: 'low', reason: '', suggested_questions: [] },
    status: 'pending'
  }
];

// --- COMPONENTS ---

const BantProgressBar = ({ label, value, icon: Icon }: { label: string, value: number, icon: any }) => {
  const getColor = (v: number) => {
    if (v >= 75) return 'bg-green-500';
    if (v >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1 text-gray-600 font-medium">
        <span className="flex items-center gap-1"><Icon size={12} /> {label}</span>
        <span>{value}/100</span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(value)} transition-all duration-500`} 
          style={{ width: `${value}%` }} 
        />
      </div>
    </div>
  );
};

const ScoreBadge = ({ score }: { score: number }) => {
  let color = 'bg-gray-100 text-gray-500';
  if (score >= 80) color = 'bg-green-100 text-green-700 border-green-200';
  else if (score >= 50) color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
  else if (score > 0) color = 'bg-red-100 text-red-700 border-red-200';

  return (
    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 ${color}`}>
      <span className="text-xl font-bold">{score > 0 ? score : '-'}</span>
      <span className="text-[10px] uppercase font-bold tracking-wider">Score</span>
    </div>
  );
};

// --- MAIN PAGE ---

export const LeadQualifierPage: React.FC = () => {
  const [leads, setLeads] = useState<LeadAnalysis[]>(MOCK_LEADS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  const handleAnalyze = async (leadId: string) => {
    // UI State update
    setAnalyzingIds(prev => new Set(prev).add(leadId));
    
    // API Simulation
    setTimeout(() => {
      // Mock Update logic
      setLeads(prev => prev.map(l => {
        if (l.lead_id === leadId) {
          return {
            ...l,
            bant_score: 65,
            status: 'qualified',
            bant_breakdown: { budget: 50, authority: 60, need: 90, timeline: 40 },
            recommendation: { 
              priority: 'medium', 
              reason: 'Hoher Need, aber Budget unklar.', 
              suggested_questions: ['Ist Budget für Q3 freigegeben?'] 
            },
            linkedin_data: { 
              position: 'Manager', company: 'Example Corp', 
              company_size: '50-200', industry: 'Retail' 
            },
            purchase_signals: [{ type: 'News', confidence: 70, context: 'Expansion angekündigt' }]
          };
        }
        return l;
      }));
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      setExpandedId(leadId); // Auto-expand after analysis
    }, 1500);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BrainCircuit className="text-purple-600" /> AI Lead Qualifier
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Priorisierte Leads basierend auf BANT & Kaufsignalen
          </p>
        </div>
        <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
          <RefreshCw size={16} /> Batch Qualify All
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {leads.map((lead) => (
          <div 
            key={lead.lead_id} 
            className={`bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden
              ${lead.recommendation?.priority === 'high' ? 'border-l-4 border-l-green-500' : 'border-gray-200'}
            `}
          >
            {/* Card Header (Always Visible) */}
            <div 
              className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(lead.lead_id)}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-800">{lead.name}</h3>
                    {lead.status === 'pending' && (
                      <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">Neu</span>
                    )}
                  </div>
                  
                  {lead.status === 'qualified' ? (
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">{lead.linkedin_data.position}</span> bei {lead.linkedin_data.company}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Noch nicht analysiert</p>
                  )}
                </div>

                <ScoreBadge score={lead.bant_score} />
              </div>

              {/* Quick Actions / Priority Label */}
              <div className="mt-4 flex justify-between items-center">
                {lead.status === 'qualified' ? (
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded
                    ${lead.recommendation.priority === 'high' ? 'bg-green-100 text-green-800' : 'bg-blue-50 text-blue-800'}
                  `}>
                    {lead.recommendation.priority} Priority
                  </span>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAnalyze(lead.lead_id); }}
                    disabled={analyzingIds.has(lead.lead_id)}
                    className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {analyzingIds.has(lead.lead_id) ? <RefreshCw className="animate-spin" size={14}/> : <BrainCircuit size={14}/>}
                    Qualifizieren
                  </button>
                )}
                
                {lead.status === 'qualified' && (
                  <div className="text-gray-400">
                    {expandedId === lead.lead_id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {expandedId === lead.lead_id && lead.status === 'qualified' && (
              <div className="bg-gray-50 border-t border-gray-100 p-5 animate-in slide-in-from-top-2">
                
                {/* AI Recommendation */}
                <div className="mb-5 bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                  <h4 className="text-xs font-bold text-purple-600 uppercase mb-1 flex items-center gap-1">
                    <BrainCircuit size={12}/> AI Empfehlung
                  </h4>
                  <p className="text-sm text-gray-800 mb-2">{lead.recommendation.reason}</p>
                  <div className="space-y-1">
                    {lead.recommendation.suggested_questions.map((q, idx) => (
                      <p key={idx} className="text-xs text-gray-500 italic">" {q} "</p>
                    ))}
                  </div>
                </div>

                {/* BANT Visuals */}
                <div className="mb-5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">BANT Analyse</h4>
                  <div className="grid grid-cols-2 gap-x-4">
                    <BantProgressBar label="Budget" value={lead.bant_breakdown.budget} icon={DollarSign} />
                    <BantProgressBar label="Authority" value={lead.bant_breakdown.authority} icon={Users} />
                    <BantProgressBar label="Need" value={lead.bant_breakdown.need} icon={AlertCircle} />
                    <BantProgressBar label="Timeline" value={lead.bant_breakdown.timeline} icon={Clock} />
                  </div>
                </div>

                {/* Purchase Signals */}
                {lead.purchase_signals.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Kaufsignale</h4>
                    <div className="space-y-2">
                      {lead.purchase_signals.map((signal, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm bg-white p-2 rounded border border-gray-200">
                          <TrendingUp size={16} className="text-green-600 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-900">{signal.type}: </span>
                            <span className="text-gray-600">{signal.context}</span>
                            <div className="text-xs text-green-600 mt-0.5">{signal.confidence}% Confidence</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadQualifierPage;

