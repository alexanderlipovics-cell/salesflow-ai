/**
 * ReviewMode Component
 * 
 * Fullscreen Overlay für Keyboard-Navigation durch Inbox Items
 */

import React, { useEffect, useState } from 'react';
import { X, Send, SkipForward, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import type { InboxItem } from '@/types/inbox';

interface ReviewModeProps {
  items: InboxItem[];
  currentIndex: number;
  onClose: () => void;
  onApprove: (itemId: string) => void;
  onSkip: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  isProcessing?: boolean;
}

export const ReviewMode: React.FC<ReviewModeProps> = ({
  items,
  currentIndex,
  onClose,
  onApprove,
  onSkip,
  onEdit,
  onPrevious,
  onNext,
  isProcessing = false,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');

  const currentItem = items[currentIndex];
  const progress = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0;

  useEffect(() => {
    if (currentItem?.action.message) {
      setEditedMessage(currentItem.action.message);
    }
  }, [currentItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editMode) return;

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (currentItem) onApprove(currentItem.id);
          break;
        case 'Escape':
          e.preventDefault();
          if (currentItem) onSkip(currentItem.id);
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          setEditMode(true);
          break;
        case 'Backspace':
          e.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPrevious();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, editMode, onApprove, onSkip, onEdit, onPrevious, onNext]);

  if (!currentItem) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Alles erledigt! 🎉</h2>
          <Button onClick={onClose}>Zurück zur Inbox</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      {/* Progress Bar */}
      <div className="h-1 bg-slate-800">
        <motion.div
          className="h-full bg-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Review Mode</h2>
            <p className="text-sm text-slate-400">
              {currentIndex + 1} / {items.length} reviewed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onPrevious} disabled={currentIndex === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onNext} disabled={currentIndex === items.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto"
          >
            {/* Lead Info */}
            <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl">
                {currentItem.lead.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1">{currentItem.lead.name}</h3>
                <p className="text-slate-400">{currentItem.lead.company || currentItem.lead.source}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400 mb-1">Konfidenz</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {currentItem.action.confidence || 0}%
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              {editMode ? (
                <textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  className="w-full h-48 p-4 bg-slate-950 border border-slate-700 rounded-lg text-white resize-none focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              ) : (
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {currentItem.action.message || 'Keine Nachricht vorhanden'}
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="border-t border-slate-800 bg-slate-900 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Enter</kbd>
            <span>Senden</span>
            <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 ml-4">E</kbd>
            <span>Bearbeiten</span>
            <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 ml-4">Esc</kbd>
            <span>Skip</span>
            <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 ml-4">←</kbd>
            <span>Zurück</span>
          </div>

          <div className="flex items-center gap-3">
            {editMode ? (
              <>
                <Button variant="ghost" onClick={() => setEditMode(false)}>
                  Abbrechen
                </Button>
                <Button
                  className="bg-cyan-500 hover:bg-cyan-600"
                  onClick={() => {
                    // TODO: Message aktualisieren
                    setEditMode(false);
                    onApprove(currentItem.id);
                  }}
                  disabled={isProcessing}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Senden
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => onSkip(currentItem.id)} disabled={isProcessing}>
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip
                </Button>
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
                <Button
                  className="bg-cyan-500 hover:bg-cyan-600"
                  onClick={() => onApprove(currentItem.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    'Sende...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Senden
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

