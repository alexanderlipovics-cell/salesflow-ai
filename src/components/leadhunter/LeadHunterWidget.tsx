/**
 * Lead Hunter Widget
 * 
 * Zeigt tägliche Lead-Vorschläge mit:
 * - Hunt Score & Priorität
 * - MLM-Signal Badges
 * - Personalisierte Opener
 * - Quick Actions
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Target,
  Zap,
  RefreshCw,
  Instagram,
  Linkedin,
  MessageCircle,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Check,
  Loader2,
} from 'lucide-react';
import { magicSend, Platform, ContactInfo } from '../../services/magicDeepLinkService';

// Types
interface HuntedLead {
  id: string;
  name: string;
  handle?: string;
  platform: string;
  profile_url?: string;
  bio_keywords: string[];
  mlm_signals: string[];
  mlm_signal_strength: 'strong' | 'medium' | 'weak' | 'none';
  hunt_score: number;
  priority: 'hot' | 'warm' | 'cold' | 'nurture';
  source: string;
  suggested_opener?: string;
  reason: string;
}

interface LeadHunterWidgetProps {
  leads?: HuntedLead[];
  isLoading?: boolean;
  onContact?: (lead: HuntedLead) => void;
  onRefresh?: () => void;
  onHunt?: () => void;
}

// Constants
const PRIORITY_CONFIG = {
  hot: { label: 'HOT', color: 'bg-red-500', icon: '🔥' },
  warm: { label: 'WARM', color: 'bg-orange-500', icon: '🟠' },
  cold: { label: 'COLD', color: 'bg-blue-500', icon: '❄️' },
  nurture: { label: 'PFLEGEN', color: 'bg-purple-500', icon: '💜' },
};

const PLATFORM_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
};

const SIGNAL_STRENGTH_COLORS = {
  strong: 'text-green-600 bg-green-100',
  medium: 'text-yellow-600 bg-yellow-100',
  weak: 'text-gray-600 bg-gray-100',
  none: 'text-gray-400 bg-gray-50',
};

// Demo Data
const DEMO_LEADS: HuntedLead[] = [
  {
    id: '1',
    name: 'Julia Fischer',
    handle: '@julia_coaching',
    platform: 'instagram',
    bio_keywords: ['coach', 'mama', 'business', 'lifestyle'],
    mlm_signals: ['selbstständig', 'freiheit', 'team'],
    mlm_signal_strength: 'strong',
    hunt_score: 85,
    priority: 'hot',
    source: 'instagram_hashtag',
    suggested_opener: 'Hey Julia! Dein Coaching-Ansatz hat mich angesprochen. Was ist deine größte Herausforderung beim Skalieren?',
    reason: 'Gefunden über #networkmarketing',
  },
  {
    id: '2',
    name: 'Sarah Weber',
    handle: '@sarah_fitness',
    platform: 'instagram',
    bio_keywords: ['fitness', 'health', 'mama'],
    mlm_signals: ['homeoffice', 'nebeneinkommen'],
    mlm_signal_strength: 'medium',
    hunt_score: 68,
    priority: 'warm',
    source: 'lookalike',
    suggested_opener: 'Hey Sarah! Als Mama weiß ich wie wertvoll Zeitfreiheit ist. Dein Profil hat mich neugierig gemacht!',
    reason: 'Ähnlich zu deinen Top-Partnern',
  },
  {
    id: '3',
    name: 'Lisa Schmidt',
    handle: '@lisa_lifestyle',
    platform: 'instagram',
    bio_keywords: ['lifestyle', 'reisen', 'freiheit'],
    mlm_signals: ['reisen', 'ortsunabhängig'],
    mlm_signal_strength: 'weak',
    hunt_score: 45,
    priority: 'cold',
    source: 'reactivation',
    suggested_opener: 'Hey Lisa! Lange nichts gehört - wie geht\'s dir? Musste gerade an dich denken!',
    reason: 'Kein Kontakt seit 30+ Tagen',
  },
];

// 🪄 Magic Contact Button für den Widget
const MagicContactButton: React.FC<{
  lead: HuntedLead;
}> = ({ lead }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  
  const handleMagicSend = useCallback(async () => {
    setState('loading');
    
    // Bestimme Plattform und Kontaktinfo
    const platform: Platform = lead.platform as Platform || 'instagram';
    const contact: ContactInfo = {
      instagram: lead.handle?.replace('@', ''),
      name: lead.name,
    };
    
    try {
      await magicSend({
        platform,
        contact,
        message: lead.suggested_opener || `Hey ${lead.name.split(' ')[0]}! 👋`,
        copyFirst: true,
        showToast: true,
      });
      
      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      console.error('Magic send error:', error);
      setState('idle');
    }
  }, [lead]);
  
  return (
    <button
      onClick={handleMagicSend}
      disabled={state === 'loading'}
      className={`
        flex-1 py-2 rounded-lg font-medium transition-colors text-sm 
        flex items-center justify-center gap-1
        ${state === 'done' 
          ? 'bg-emerald-500 text-white' 
          : 'bg-purple-500 hover:bg-purple-600 text-white'
        }
      `}
    >
      {state === 'loading' ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : state === 'done' ? (
        <>
          <Check className="w-4 h-4" />
          Kopiert!
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Magic Send
          <ChevronRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
};

// Components
const LeadCard: React.FC<{
  lead: HuntedLead;
  onContact: () => void;
  index: number;
}> = ({ lead, onContact, index }) => {
  const [showOpener, setShowOpener] = useState(false);
  
  const priority = PRIORITY_CONFIG[lead.priority];
  const PlatformIcon = PLATFORM_ICONS[lead.platform] || Instagram;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar / Platform */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {lead.name.charAt(0)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
              <PlatformIcon className="w-4 h-4 text-pink-500" />
            </div>
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-gray-900">{lead.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${priority.color}`}>
                {priority.icon} {priority.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">{lead.handle}</p>
          </div>
          
          {/* Score */}
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{lead.hunt_score}</div>
            <div className="text-xs text-gray-400">Score</div>
          </div>
        </div>
        
        {/* Keywords */}
        <div className="mt-3 flex flex-wrap gap-1">
          {lead.bio_keywords.slice(0, 4).map(keyword => (
            <span key={keyword} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
              {keyword}
            </span>
          ))}
        </div>
        
        {/* MLM Signals */}
        {lead.mlm_signals.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SIGNAL_STRENGTH_COLORS[lead.mlm_signal_strength]}`}>
              {lead.mlm_signals.slice(0, 2).join(', ')}
            </span>
          </div>
        )}
        
        {/* Reason */}
        <p className="mt-2 text-xs text-gray-400 italic">{lead.reason}</p>
      </div>
      
      {/* Opener */}
      <AnimatePresence>
        {showOpener && lead.suggested_opener && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 bg-purple-50 px-4 py-3"
          >
            <div className="flex items-start gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-500 mt-0.5" />
              <p className="text-sm text-gray-700 flex-1">{lead.suggested_opener}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Actions - 🪄 Mit Magic Send */}
      <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
        <button
          onClick={() => setShowOpener(!showOpener)}
          className="flex-1 py-2 text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors text-sm"
        >
          {showOpener ? 'Verstecken' : '💬 Opener zeigen'}
        </button>
        {/* 🪄 Magic Contact Button */}
        <MagicContactButton lead={lead} />
      </div>
    </motion.div>
  );
};

// Main Component
export const LeadHunterWidget: React.FC<LeadHunterWidgetProps> = ({
  leads = DEMO_LEADS,
  isLoading = false,
  onContact,
  onRefresh,
  onHunt,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-purple-500" />
          <h2 className="text-lg font-bold text-gray-900">Lead Hunter</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onHunt}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Neue Suche
          </button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-lg p-3 text-white">
          <div className="text-2xl font-bold">{leads.filter(l => l.priority === 'hot').length}</div>
          <div className="text-xs opacity-80">🔥 Hot Leads</div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-3 text-white">
          <div className="text-2xl font-bold">{leads.length}</div>
          <div className="text-xs opacity-80">Heute gefunden</div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-3 text-white">
          <div className="text-2xl font-bold">{Math.round(leads.reduce((acc, l) => acc + l.hunt_score, 0) / leads.length)}</div>
          <div className="text-xs opacity-80">Ø Score</div>
        </div>
      </div>
      
      {/* Leads */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 mb-1">Keine Leads gefunden</h3>
          <p className="text-gray-500 text-sm mb-4">Starte eine neue Suche um potenzielle Partner zu finden.</p>
          <button
            onClick={onHunt}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
          >
            Lead-Jagd starten
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead, index) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              index={index}
              onContact={() => onContact?.(lead)}
            />
          ))}
        </div>
      )}
      
      {/* Tips */}
      {leads.length > 0 && (
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-1">Tipp des Tages</h4>
              <p className="text-sm text-gray-600">
                {leads.filter(l => l.bio_keywords.includes('mama')).length > 0 
                  ? '👩‍👧 Mehrere Mama-Profile gefunden! Nutze das "Zeitfreiheit" Argument für mehr Resonanz.'
                  : '🎯 Fokussiere dich auf die HOT Leads - sie haben die höchste Abschlusswahrscheinlichkeit!'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadHunterWidget;

