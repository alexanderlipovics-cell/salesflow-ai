/**
 * 🪄 Platform Magic Send Components
 * 
 * Spezialisierte Komponenten für:
 * - Instagram DM Magic
 * - LinkedIn Message Magic
 * - Email Magic
 * 
 * Mit Template-Auswahl und plattform-spezifischen Optimierungen
 * 
 * @author SalesFlow AI
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Instagram,
  Linkedin,
  Mail,
  Send,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  MessageSquare,
  Zap,
} from 'lucide-react';
import {
  magicSend,
  getAllTemplates,
  getRandomTemplate,
  fillTemplate,
  PLATFORM_TEMPLATES,
  Platform,
  ContactInfo,
} from '../../services/magicDeepLinkService';

// ═══════════════════════════════════════════════════════════════════════════════
// INSTAGRAM MAGIC SEND
// ═══════════════════════════════════════════════════════════════════════════════

interface InstagramMagicProps {
  contact: ContactInfo;
  userName?: string;
  onSent?: () => void;
  className?: string;
}

export const InstagramMagicSend: React.FC<InstagramMagicProps> = ({
  contact,
  userName,
  onSent,
  className = '',
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(
    getRandomTemplate('instagram', contact, userName)
  );
  const [customMessage, setCustomMessage] = useState('');
  
  const templates = getAllTemplates('instagram', contact, userName);
  const activeMessage = customMessage || selectedMessage;
  
  const handleSend = useCallback(async () => {
    setState('loading');
    
    try {
      await magicSend({
        platform: 'instagram',
        contact,
        message: activeMessage,
        copyFirst: true,
        showToast: true,
      });
      
      setState('sent');
      onSent?.();
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      console.error('Instagram magic send error:', error);
      setState('idle');
    }
  }, [contact, activeMessage, onSent]);
  
  const shuffleTemplate = () => {
    const newTemplate = getRandomTemplate('instagram', contact, userName);
    setSelectedMessage(newTemplate);
    setCustomMessage('');
  };
  
  return (
    <div className={`bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-pink-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Instagram DM</h3>
              <p className="text-xs text-pink-300">@{contact.instagram?.replace('@', '')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="p-2 text-pink-400 hover:text-white transition-colors"
          >
            {showTemplates ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {/* Template Selector */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 bg-black/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-pink-300 font-medium">Templates</span>
                <button
                  onClick={shuffleTemplate}
                  className="text-xs text-pink-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Shuffle
                </button>
              </div>
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedMessage(template);
                    setCustomMessage('');
                  }}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                    selectedMessage === template && !customMessage
                      ? 'bg-pink-500/30 border border-pink-500'
                      : 'bg-slate-800/50 border border-transparent hover:border-pink-500/50'
                  }`}
                >
                  <p className="text-slate-200 line-clamp-2">{template}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Message Editor */}
      <div className="p-4">
        <textarea
          value={activeMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Deine Instagram DM..."
          className="w-full bg-slate-900/50 border border-pink-500/30 rounded-xl p-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 h-24"
        />
        
        <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
          <span>{activeMessage.length} Zeichen</span>
          {customMessage && (
            <button
              onClick={() => setCustomMessage('')}
              className="text-pink-400 hover:text-pink-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      
      {/* Send Button */}
      <div className="p-4 pt-0">
        <button
          onClick={handleSend}
          disabled={state === 'loading' || !contact.instagram}
          className={`
            w-full py-4 rounded-xl font-bold text-white transition-all
            flex items-center justify-center gap-2
            ${state === 'sent'
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg shadow-pink-500/25
          `}
        >
          {state === 'loading' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : state === 'sent' ? (
            <>
              <Check className="w-5 h-5" />
              Kopiert & Instagram geöffnet!
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Magic Send Instagram
            </>
          )}
        </button>
        
        <p className="text-center text-xs text-slate-500 mt-2">
          📋 Nachricht kopiert → 📱 Instagram öffnet sich → 💬 Einfügen & Senden
        </p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LINKEDIN MAGIC SEND
// ═══════════════════════════════════════════════════════════════════════════════

interface LinkedInMagicProps {
  contact: ContactInfo;
  userName?: string;
  onSent?: () => void;
  className?: string;
}

export const LinkedInMagicSend: React.FC<LinkedInMagicProps> = ({
  contact,
  userName,
  onSent,
  className = '',
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(
    getRandomTemplate('linkedin', contact, userName)
  );
  const [customMessage, setCustomMessage] = useState('');
  
  const templates = getAllTemplates('linkedin', contact, userName);
  const activeMessage = customMessage || selectedMessage;
  
  const handleSend = useCallback(async () => {
    setState('loading');
    
    try {
      await magicSend({
        platform: 'linkedin',
        contact,
        message: activeMessage,
        copyFirst: true,
        showToast: true,
      });
      
      setState('sent');
      onSent?.();
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      console.error('LinkedIn magic send error:', error);
      setState('idle');
    }
  }, [contact, activeMessage, onSent]);
  
  return (
    <div className={`bg-gradient-to-br from-blue-600/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0A66C2] rounded-xl flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">LinkedIn Message</h3>
              <p className="text-xs text-blue-300">{contact.name || contact.linkedin}</p>
            </div>
          </div>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="p-2 text-blue-400 hover:text-white transition-colors"
          >
            {showTemplates ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {/* Template Selector */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 bg-black/20">
              <span className="text-xs text-blue-300 font-medium">Professionelle Templates</span>
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedMessage(template);
                    setCustomMessage('');
                  }}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                    selectedMessage === template && !customMessage
                      ? 'bg-blue-500/30 border border-blue-500'
                      : 'bg-slate-800/50 border border-transparent hover:border-blue-500/50'
                  }`}
                >
                  <p className="text-slate-200 line-clamp-2">{template}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Message Editor */}
      <div className="p-4">
        <textarea
          value={activeMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Ihre LinkedIn Nachricht..."
          className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl p-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 h-28"
        />
        
        {/* LinkedIn Character Limit Indicator */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-24 bg-slate-700 rounded-full overflow-hidden`}>
              <div 
                className={`h-full transition-all ${
                  activeMessage.length > 280 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, (activeMessage.length / 300) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">{activeMessage.length}/300</span>
          </div>
          {customMessage && (
            <button
              onClick={() => setCustomMessage('')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      
      {/* Send Button */}
      <div className="p-4 pt-0">
        <button
          onClick={handleSend}
          disabled={state === 'loading' || !contact.linkedin}
          className={`
            w-full py-4 rounded-xl font-bold text-white transition-all
            flex items-center justify-center gap-2
            ${state === 'sent'
              ? 'bg-emerald-500'
              : 'bg-[#0A66C2] hover:bg-[#004182]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg shadow-blue-500/25
          `}
        >
          {state === 'loading' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : state === 'sent' ? (
            <>
              <Check className="w-5 h-5" />
              Kopiert & LinkedIn geöffnet!
            </>
          ) : (
            <>
              <Linkedin className="w-5 h-5" />
              Magic Send LinkedIn
            </>
          )}
        </button>
        
        <p className="text-center text-xs text-slate-500 mt-2">
          💼 Professionell formuliert → 📋 Kopiert → 🔗 LinkedIn öffnet sich
        </p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL MAGIC SEND
// ═══════════════════════════════════════════════════════════════════════════════

interface EmailMagicProps {
  contact: ContactInfo;
  userName?: string;
  onSent?: () => void;
  className?: string;
}

export const EmailMagicSend: React.FC<EmailMagicProps> = ({
  contact,
  userName,
  onSent,
  className = '',
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Email Templates mit Subject
  const emailTemplates = PLATFORM_TEMPLATES.email.map(t => ({
    subject: fillTemplate(t.subject, contact, userName),
    body: fillTemplate(t.body, contact, userName),
  }));
  
  const [selectedTemplate, setSelectedTemplate] = useState(emailTemplates[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  
  const activeSubject = customSubject || selectedTemplate.subject;
  const activeBody = customBody || selectedTemplate.body;
  
  const handleSend = useCallback(async () => {
    setState('loading');
    
    try {
      await magicSend({
        platform: 'email',
        contact,
        message: activeBody,
        emailSubject: activeSubject,
        copyFirst: true,
        showToast: true,
      });
      
      setState('sent');
      onSent?.();
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      console.error('Email magic send error:', error);
      setState('idle');
    }
  }, [contact, activeSubject, activeBody, onSent]);
  
  return (
    <div className={`bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">E-Mail</h3>
              <p className="text-xs text-red-300">{contact.email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="p-2 text-red-400 hover:text-white transition-colors"
          >
            {showTemplates ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {/* Template Selector */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 bg-black/20">
              <span className="text-xs text-red-300 font-medium">E-Mail Templates</span>
              {emailTemplates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setCustomSubject('');
                    setCustomBody('');
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedTemplate === template && !customSubject && !customBody
                      ? 'bg-red-500/30 border border-red-500'
                      : 'bg-slate-800/50 border border-transparent hover:border-red-500/50'
                  }`}
                >
                  <p className="text-white font-medium text-sm">{template.subject}</p>
                  <p className="text-slate-400 text-xs mt-1 line-clamp-2">{template.body}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Subject & Body Editor */}
      <div className="p-4 space-y-3">
        {/* Subject */}
        <div>
          <label className="text-xs text-red-300 font-medium mb-1 block">Betreff</label>
          <input
            type="text"
            value={activeSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            placeholder="E-Mail Betreff..."
            className="w-full bg-slate-900/50 border border-red-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        
        {/* Body */}
        <div>
          <label className="text-xs text-red-300 font-medium mb-1 block">Nachricht</label>
          <textarea
            value={activeBody}
            onChange={(e) => setCustomBody(e.target.value)}
            placeholder="E-Mail Inhalt..."
            className="w-full bg-slate-900/50 border border-red-500/30 rounded-xl p-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 h-32"
          />
        </div>
        
        {(customSubject || customBody) && (
          <button
            onClick={() => {
              setCustomSubject('');
              setCustomBody('');
            }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            ↩️ Template zurücksetzen
          </button>
        )}
      </div>
      
      {/* Send Button */}
      <div className="p-4 pt-0">
        <button
          onClick={handleSend}
          disabled={state === 'loading' || !contact.email}
          className={`
            w-full py-4 rounded-xl font-bold text-white transition-all
            flex items-center justify-center gap-2
            ${state === 'sent'
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg shadow-red-500/25
          `}
        >
          {state === 'loading' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : state === 'sent' ? (
            <>
              <Check className="w-5 h-5" />
              E-Mail App geöffnet!
            </>
          ) : (
            <>
              <Mail className="w-5 h-5" />
              Magic Send E-Mail
            </>
          )}
        </button>
        
        <p className="text-center text-xs text-slate-500 mt-2">
          📧 E-Mail mit Betreff & Text → 📋 Direkt in deiner Mail-App
        </p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED PLATFORM PANEL
// ═══════════════════════════════════════════════════════════════════════════════

interface PlatformMagicPanelProps {
  contact: ContactInfo;
  userName?: string;
  onSent?: (platform: Platform) => void;
  className?: string;
}

export const PlatformMagicPanel: React.FC<PlatformMagicPanelProps> = ({
  contact,
  userName,
  onSent,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'instagram' | 'linkedin' | 'email'>('instagram');
  
  const tabs = [
    { id: 'instagram' as const, icon: Instagram, label: 'Instagram', available: !!contact.instagram, color: 'from-pink-500 to-purple-600' },
    { id: 'linkedin' as const, icon: Linkedin, label: 'LinkedIn', available: !!contact.linkedin, color: 'from-blue-500 to-cyan-500' },
    { id: 'email' as const, icon: Mail, label: 'E-Mail', available: !!contact.email, color: 'from-red-500 to-orange-500' },
  ];
  
  return (
    <div className={`bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden ${className}`}>
      {/* Tab Header */}
      <div className="flex border-b border-slate-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => tab.available && setActiveTab(tab.id)}
            disabled={!tab.available}
            className={`
              flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all
              ${activeTab === tab.id 
                ? `bg-gradient-to-r ${tab.color} text-white` 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }
              ${!tab.available && 'opacity-30 cursor-not-allowed'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'instagram' && contact.instagram && (
          <InstagramMagicSend
            contact={contact}
            userName={userName}
            onSent={() => onSent?.('instagram')}
          />
        )}
        {activeTab === 'linkedin' && contact.linkedin && (
          <LinkedInMagicSend
            contact={contact}
            userName={userName}
            onSent={() => onSent?.('linkedin')}
          />
        )}
        {activeTab === 'email' && contact.email && (
          <EmailMagicSend
            contact={contact}
            userName={userName}
            onSent={() => onSent?.('email')}
          />
        )}
        
        {/* Fallback wenn nichts verfügbar */}
        {!contact.instagram && !contact.linkedin && !contact.email && (
          <div className="text-center py-8 text-slate-400">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Keine Kontaktdaten für diese Plattformen verfügbar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default PlatformMagicPanel;

