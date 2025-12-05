/**
 * ChatImportModal - 30-Sekunden Chat Import für Networker
 * 
 * Flow:
 * 1. User fügt Chat-Text ein
 * 2. AI analysiert und extrahiert Leads
 * 3. User wählt aus welche Leads importiert werden
 * 4. Done! ✅
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  importChatPaste,
  ExtractedLead,
  ChatImportResponse,
  SENTIMENT_COLORS,
  SENTIMENT_EMOJIS,
  ACTION_EMOJIS,
  formatRelativeDate,
} from '../../services/chatImportService';

interface ChatImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (leads: ExtractedLead[]) => void;
}

type ImportStep = 'paste' | 'preview' | 'confirm' | 'success';

export const ChatImportModal: React.FC<ChatImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<ImportStep>('paste');
  const [rawText, setRawText] = useState('');
  const [myName, setMyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ChatImportResponse | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Reset Modal
  const handleClose = () => {
    setStep('paste');
    setRawText('');
    setMyName('');
    setError(null);
    setImportResult(null);
    setSelectedLeads(new Set());
    onClose();
  };

  // Step 1: Text einfügen und analysieren
  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      setError('Bitte füge einen Chat-Verlauf ein');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await importChatPaste({
        raw_text: rawText,
        my_name: myName || undefined,
        auto_create_leads: false,
      });

      setImportResult(result);
      // Alle Leads vorselektieren
      setSelectedLeads(new Set(result.leads.map((_, i) => i.toString())));
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Lead Selection
  const toggleLead = (index: number) => {
    const key = index.toString();
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select All / None
  const toggleAll = () => {
    if (selectedLeads.size === importResult?.leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(importResult?.leads.map((_, i) => i.toString()) || []));
    }
  };

  // Step 2: Import bestätigen
  const handleConfirmImport = async () => {
    if (!importResult) return;

    const leadsToImport = importResult.leads.filter((_, i) => 
      selectedLeads.has(i.toString())
    );

    setIsLoading(true);

    try {
      // TODO: API Call zum tatsächlichen Lead-Erstellen
      // Für jetzt simulieren wir nur
      await new Promise(resolve => setTimeout(resolve, 500));

      onImportComplete?.(leadsToImport);
      setStep('success');
    } catch (err) {
      setError('Leads konnten nicht erstellt werden');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl mx-4 bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📥 Chat Import
              {step === 'preview' && importResult && (
                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full">
                  {importResult.total_leads} Leads gefunden
                </span>
              )}
            </h2>
            <p className="text-gray-400 text-sm">
              {step === 'paste' && 'Füge deinen Chat-Verlauf ein'}
              {step === 'preview' && 'Wähle aus, welche Leads importiert werden sollen'}
              {step === 'confirm' && 'Bestätige den Import'}
              {step === 'success' && 'Import abgeschlossen!'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Paste */}
            {step === 'paste' && (
              <motion.div
                key="paste"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Chat-Verlauf (WhatsApp, Instagram, Telegram, oder Liste)
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Beispiel WhatsApp:
[05.12.24, 14:30] Max: Hey, das klingt interessant!
[05.12.24, 14:35] Du: Super, wann hast du Zeit?

Oder einfach eine Liste:
Max Mustermann, +49 151 12345678
Lisa Schmidt, +49 152 87654321`}
                    className="w-full h-48 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 resize-none focus:border-purple-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Dein Name im Chat (optional - um dich auszuschließen)
                  </label>
                  <input
                    type="text"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="z.B. Du, Ich, Max..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                    ⚠️ {error}
                  </div>
                )}

                {/* Platform Info */}
                <div className="grid grid-cols-4 gap-2 p-3 bg-white/5 rounded-xl">
                  {[
                    { icon: '📱', label: 'WhatsApp' },
                    { icon: '📸', label: 'Instagram' },
                    { icon: '✈️', label: 'Telegram' },
                    { icon: '📋', label: 'Liste' },
                  ].map((platform) => (
                    <div key={platform.label} className="text-center">
                      <div className="text-2xl mb-1">{platform.icon}</div>
                      <div className="text-xs text-gray-400">{platform.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Preview */}
            {step === 'preview' && importResult && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Summary */}
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(importResult.summary).map(([sentiment, count]) => (
                    count > 0 && (
                      <span
                        key={sentiment}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{ 
                          backgroundColor: `${SENTIMENT_COLORS[sentiment as keyof typeof SENTIMENT_COLORS]}20`,
                          color: SENTIMENT_COLORS[sentiment as keyof typeof SENTIMENT_COLORS],
                        }}
                      >
                        {SENTIMENT_EMOJIS[sentiment as keyof typeof SENTIMENT_EMOJIS]} {count} {sentiment}
                      </span>
                    )
                  ))}
                </div>

                {/* Select All */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={toggleAll}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    {selectedLeads.size === importResult.leads.length ? 'Keine auswählen' : 'Alle auswählen'}
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedLeads.size} von {importResult.leads.length} ausgewählt
                  </span>
                </div>

                {/* Lead List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {importResult.leads.map((lead, index) => (
                    <div
                      key={index}
                      onClick={() => toggleLead(index)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        selectedLeads.has(index.toString())
                          ? 'bg-purple-500/20 border border-purple-500/50'
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                          selectedLeads.has(index.toString())
                            ? 'bg-purple-500 text-white'
                            : 'border border-gray-500'
                        }`}>
                          {selectedLeads.has(index.toString()) && '✓'}
                        </div>

                        {/* Lead Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{lead.name}</span>
                            <span
                              className="px-1.5 py-0.5 text-xs rounded"
                              style={{ 
                                backgroundColor: `${SENTIMENT_COLORS[lead.sentiment]}20`,
                                color: SENTIMENT_COLORS[lead.sentiment],
                              }}
                            >
                              {lead.sentiment_label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            {lead.phone && <span>📱 {lead.phone}</span>}
                            {lead.message_count > 0 && <span>💬 {lead.message_count} Nachrichten</span>}
                          </div>
                          {lead.last_message && (
                            <p className="text-gray-500 text-sm truncate mt-1">
                              "{lead.last_message}"
                            </p>
                          )}
                        </div>

                        {/* Suggested Action */}
                        <div className="text-right flex-shrink-0">
                          <span className="text-2xl">{ACTION_EMOJIS[lead.suggested_action]}</span>
                          <div className="text-xs text-gray-500">{lead.suggested_action_label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {selectedLeads.size} Leads importiert!
                </h3>
                <p className="text-gray-400 mb-6">
                  Die Leads wurden erstellt und Follow-ups wurden geplant.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-all"
                  >
                    Fertig
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/5">
            {step === 'paste' ? (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-all"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading || !rawText.trim()}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analysiere...
                    </>
                  ) : (
                    <>✨ Analysieren</>
                  )}
                </button>
              </>
            ) : step === 'preview' ? (
              <>
                <button
                  onClick={() => setStep('paste')}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-all"
                >
                  ← Zurück
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isLoading || selectedLeads.size === 0}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importiere...
                    </>
                  ) : (
                    <>✅ {selectedLeads.size} Leads importieren</>
                  )}
                </button>
              </>
            ) : null}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ChatImportModal;

