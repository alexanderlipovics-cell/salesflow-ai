/**
 * ChiefEditPopup Component
 * 
 * Popup zum Bearbeiten von Nachrichten mit CHIEF
 * User gibt Anweisungen (z.B. "kürzer", "mehr Emojis"), CHIEF passt an
 */

import React, { useState } from 'react';
import { Loader2, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/authService';
import ChiefModal from '../ui/ChiefModal';

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

  return (
    <ChiefModal
      isOpen={isOpen}
      onClose={handleClose}
      title="CHIEF - Nachricht anpassen"
      icon={<Zap className="text-yellow-500 w-5 h-5" />}
      actions={
        <>
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            Abbrechen
          </Button>
          {newMessage && (
            <Button
              onClick={handleApply}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Übernehmen
            </Button>
          )}
          {!newMessage && (
            <Button
              onClick={handleSubmit}
              disabled={!userInput.trim() || isLoading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
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
        </>
      }
    >
      <div className="space-y-4">
        {/* Original Nachricht */}
        <div className="bg-[#0B0F19] rounded-xl p-4 border border-gray-700/50">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-bold">Original:</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{originalMessage}</p>
        </div>

        {/* User Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Deine Anweisung an CHIEF:
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
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Drücke Enter zum Generieren
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            <span className="ml-2 text-gray-400">CHIEF bearbeitet...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* CHIEF Response */}
        {newMessage && !isLoading && (
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
            <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wider font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              CHIEF's Vorschlag:
            </p>
            <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{newMessage}</p>
          </div>
        )}
      </div>
    </ChiefModal>
  );
};

export default ChiefEditPopup;
