/**
 * ChiefEditPopup Component
 * 
 * Popup zum Bearbeiten von Nachrichten mit CHIEF
 * User gibt Anweisungen (z.B. "kürzer", "mehr Emojis"), CHIEF passt an
 */

import React, { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/authService';
// Simple Dialog Component (falls nicht vorhanden)
const Dialog = ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-900 border border-slate-700 rounded-lg shadow-xl ${className}`}>
    {children}
  </div>
);

const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="px-6 pt-6 pb-4">
    {children}
  </div>
);

const DialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`text-xl font-semibold ${className}`}>
    {children}
  </h2>
);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
  : (import.meta.env.PROD ? 'https://salesflow-ai.onrender.com' : 'http://localhost:8000');

interface ChiefEditPopupProps {
  isOpen: boolean;
  onClose: () => void;
  originalMessage: string;
  leadContext: {
    name: string;
    source: string;
    notes?: string;
  };
  onMessageUpdated: (newMessage: string) => void;
}

export const ChiefEditPopup: React.FC<ChiefEditPopupProps> = ({
  isOpen,
  onClose,
  originalMessage,
  leadContext,
  onMessageUpdated,
}) => {
  const [userInput, setUserInput] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userInput.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Token holen
      let token = authService.getAccessToken();
      if (!token) {
        token = localStorage.getItem('access_token');
      }
      if (!token) {
        throw new Error('Nicht authentifiziert');
      }

      // API Call zu CHIEF
      const response = await fetch(`${API_BASE_URL}/api/chief/edit-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          original_message: originalMessage,
          user_instruction: userInput.trim(),
          lead_context: leadContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(errorData.detail || errorData.error || 'Fehler beim Bearbeiten');
      }

      const data = await response.json();
      setNewMessage(data.edited_message || '');
    } catch (err) {
      console.error('CHIEF Edit Error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Bearbeiten der Nachricht');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (newMessage) {
      console.log('Übernehmen clicked, newMessage:', newMessage);
      onMessageUpdated(newMessage);
      setUserInput('');
      setNewMessage('');
      setError(null);
      onClose();
    }
  };

  const handleClose = () => {
    setUserInput('');
    setNewMessage('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div className="relative z-50 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
          <div className="px-6 pt-6 pb-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              CHIEF - Nachricht anpassen
            </h2>
          </div>

          <div className="px-6 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Original Nachricht */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Original:</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{originalMessage}</p>
          </div>

          {/* User Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Deine Anweisung:
            </label>
            <input
              type="text"
              placeholder="z.B. 'Kürzer' oder 'Mehr Emojis' oder 'Frag nach Telefonnummer'"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 mt-1">
              Drücke Enter zum Generieren
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <span className="ml-2 text-slate-400">CHIEF bearbeitet...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* CHIEF Response */}
          {newMessage && !isLoading && (
            <div className="bg-cyan-500/10 border border-cyan-500/50 rounded-lg p-4">
              <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                CHIEF's Vorschlag:
              </p>
              <p className="text-sm text-cyan-100 whitespace-pre-wrap">{newMessage}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-slate-400 hover:text-white"
            >
              Abbrechen
            </Button>
            {newMessage && (
              <Button
                onClick={handleApply}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                Übernehmen
              </Button>
            )}
            {!newMessage && (
              <Button
                onClick={handleSubmit}
                disabled={!userInput.trim() || isLoading}
                className="bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Bearbeiten...
                  </>
                ) : (
                  'Bearbeiten'
                )}
              </Button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChiefEditPopup;
