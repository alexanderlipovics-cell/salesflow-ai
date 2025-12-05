/**
 * MagicOnboardingFlow - First Win in 2 Minutes
 * 
 * Ziel: User generiert seine erste AI-Email in unter 2 Minuten
 * 
 * Flow:
 * 1. Lead auswählen oder erstellen (30 Sek)
 * 2. Aktion wählen (10 Sek)
 * 3. AI generiert → Copy/Send (60 Sek)
 * 4. Celebration! 🎉
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Lead {
  id: string;
  name: string;
  email?: string;
  company?: string;
  avatar?: string;
}

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
}

type ActionType = 'first_message' | 'follow_up' | 'call_prep';

interface MagicOnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
  existingLeads?: Lead[];
}

// Demo Leads für neue User
const DEMO_LEADS: Lead[] = [
  { id: 'demo-1', name: 'Max Mustermann', company: 'Tech GmbH', email: 'max@tech.de' },
  { id: 'demo-2', name: 'Lisa Schmidt', company: 'Sales AG', email: 'lisa@sales.de' },
  { id: 'demo-3', name: 'Thomas Weber', company: 'Digital Corp', email: 'thomas@digital.de' },
];

const STEPS: OnboardingStep[] = [
  { id: 1, title: 'Wähle einen Lead', subtitle: 'Mit wem möchtest du starten?' },
  { id: 2, title: 'Was möchtest du tun?', subtitle: 'Wähle eine Aktion' },
  { id: 3, title: 'Deine AI-Nachricht', subtitle: 'Bearbeiten, kopieren oder senden' },
];

const ACTION_OPTIONS = [
  { 
    id: 'first_message' as ActionType, 
    icon: '📧', 
    title: 'Erste Nachricht', 
    desc: 'Erstkontakt aufnehmen' 
  },
  { 
    id: 'follow_up' as ActionType, 
    icon: '🔄', 
    title: 'Follow-up', 
    desc: 'Nachfassen' 
  },
  { 
    id: 'call_prep' as ActionType, 
    icon: '📞', 
    title: 'Call vorbereiten', 
    desc: 'Gesprächsleitfaden' 
  },
];

export const MagicOnboardingFlow: React.FC<MagicOnboardingFlowProps> = ({
  onComplete,
  onSkip,
  existingLeads = [],
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newLeadMode, setNewLeadMode] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadCompany, setNewLeadCompany] = useState('');

  // Kombiniere existierende und Demo-Leads
  const availableLeads = existingLeads.length > 0 ? existingLeads : DEMO_LEADS;

  // AI Message Generation (Mock - später durch echten API Call ersetzen)
  const generateMessage = async () => {
    setIsGenerating(true);
    
    // Simuliere API Call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const messages: Record<ActionType, string> = {
      first_message: `Hey ${selectedLead?.name?.split(' ')[0] || 'dort'}! 👋

Ich bin auf ${selectedLead?.company || 'euer Unternehmen'} aufmerksam geworden und finde eure Arbeit spannend.

Kurze Frage: Habt ihr aktuell Kapazitäten für ein kurzes Gespräch? Ich hätte eine Idee, die für euch interessant sein könnte.

Kein Druck – sag einfach Bescheid, ob's passt! 🙂`,
      
      follow_up: `Hey ${selectedLead?.name?.split(' ')[0] || 'dort'}! 

Wollte kurz nachfragen, ob du meine letzte Nachricht gesehen hast?

Falls gerade nicht der richtige Zeitpunkt ist, kein Problem – sag mir einfach Bescheid, wann es besser passt.

Einen schönen Tag noch! 🙌`,
      
      call_prep: `📞 GESPRÄCHSLEITFADEN für ${selectedLead?.name}

**Eröffnung (30 Sek):**
"Hey ${selectedLead?.name?.split(' ')[0]}, danke dass du dir die Zeit nimmst!"

**Discovery (2 Min):**
- Was sind eure aktuellen Prioritäten bei ${selectedLead?.company}?
- Wo seht ihr die größten Herausforderungen?

**Pitch (1 Min):**
- Basierend auf dem, was du sagst, könnte [Lösung] helfen...

**Next Steps:**
- "Was wäre ein guter nächster Schritt für dich?"`,
    };
    
    setGeneratedMessage(messages[selectedAction || 'first_message']);
    setIsGenerating(false);
  };

  // Handle Step Navigation
  const goToNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      if (currentStep === 2) {
        generateMessage();
      }
    }
  };

  // Copy to Clipboard
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Complete Onboarding
  const handleComplete = () => {
    setShowCelebration(true);
    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  // Create New Lead
  const handleCreateLead = () => {
    if (newLeadName.trim()) {
      const newLead: Lead = {
        id: `new-${Date.now()}`,
        name: newLeadName,
        company: newLeadCompany || undefined,
      };
      setSelectedLead(newLead);
      setNewLeadMode(false);
      goToNextStep();
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80 z-50"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="text-8xl mb-6"
              >
                🎉
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-bold text-white mb-4"
              >
                Geschafft!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xl text-gray-300"
              >
                Du hast gerade deine erste AI-Nachricht erstellt! 🚀
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative w-full max-w-2xl mx-4">
        {/* Skip Button */}
        {onSkip && (
          <button
            onClick={onSkip}
            className="absolute -top-12 right-0 text-gray-400 hover:text-white text-sm"
          >
            Überspringen →
          </button>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex items-center ${
                  step.id <= currentStep ? 'text-purple-400' : 'text-gray-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step.id < currentStep
                      ? 'bg-purple-500 text-white'
                      : step.id === currentStep
                      ? 'bg-purple-500/30 border-2 border-purple-500 text-purple-400'
                      : 'bg-gray-800 text-gray-600'
                  }`}
                >
                  {step.id < currentStep ? '✓' : step.id}
                </div>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(currentStep / 3) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {STEPS[currentStep - 1].title}
            </h2>
            <p className="text-gray-400">
              {STEPS[currentStep - 1].subtitle}
            </p>
          </div>

          {/* Step 1: Lead Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {!newLeadMode ? (
                <>
                  <div className="grid gap-3">
                    {availableLeads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setSelectedLead(lead);
                          goToNextStep();
                        }}
                        className={`w-full p-4 rounded-xl text-left transition-all ${
                          selectedLead?.id === lead.id
                            ? 'bg-purple-500/30 border-2 border-purple-500'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-white font-medium">{lead.name}</div>
                            {lead.company && (
                              <div className="text-gray-400 text-sm">{lead.company}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-4 bg-transparent text-gray-500 text-sm">oder</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setNewLeadMode(true)}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-white/20 text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-all"
                  >
                    + Neuen Lead erstellen
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Firma (optional)"
                    value={newLeadCompany}
                    onChange={(e) => setNewLeadCompany(e.target.value)}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setNewLeadMode(false)}
                      className="flex-1 p-4 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10"
                    >
                      Zurück
                    </button>
                    <button
                      onClick={handleCreateLead}
                      disabled={!newLeadName.trim()}
                      className="flex-1 p-4 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Weiter →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Action Selection */}
          {currentStep === 2 && (
            <div className="grid gap-4">
              {ACTION_OPTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    setSelectedAction(action.id);
                    goToNextStep();
                  }}
                  className="w-full p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl group-hover:scale-110 transition-transform">
                      {action.icon}
                    </div>
                    <div>
                      <div className="text-white font-medium text-lg">{action.title}</div>
                      <div className="text-gray-400">{action.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Generated Message */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
                  <p className="text-gray-400">AI generiert deine Nachricht...</p>
                </div>
              ) : (
                <>
                  {/* Lead Info */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {selectedLead?.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-medium">{selectedLead?.name}</div>
                      <div className="text-gray-400 text-sm">
                        {ACTION_OPTIONS.find(a => a.id === selectedAction)?.title}
                      </div>
                    </div>
                  </div>

                  {/* Message Box */}
                  <div className="relative">
                    <textarea
                      value={generatedMessage}
                      onChange={(e) => setGeneratedMessage(e.target.value)}
                      className="w-full h-64 p-4 rounded-xl bg-white/5 border border-white/10 text-white resize-none focus:border-purple-500 focus:outline-none"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                      ✨ Powered by AI
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={copyToClipboard}
                      className={`flex-1 p-4 rounded-xl font-medium transition-all ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {copied ? '✓ Kopiert!' : '📋 Kopieren'}
                    </button>
                    <button
                      onClick={handleComplete}
                      className="flex-1 p-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-90 transition-opacity"
                    >
                      ✅ Fertig!
                    </button>
                  </div>

                  {/* Tip */}
                  <p className="text-center text-gray-500 text-sm">
                    💡 Tipp: Du kannst die Nachricht vor dem Kopieren anpassen!
                  </p>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Timer */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            🚀 Dein erster AI-Erfolg in unter 2 Minuten
          </p>
        </div>
      </div>
    </div>
  );
};

export default MagicOnboardingFlow;

