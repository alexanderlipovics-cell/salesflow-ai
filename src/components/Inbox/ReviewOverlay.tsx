/**
 * ReviewOverlay Component
 * 
 * Fullscreen Overlay für Magic Send All mit Deep Links
 * ENTER → App öffnet sich mit vorausgefülltem Text → Nächster Draft
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, SkipForward, Edit3, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface DraftMessage {
  id: string;
  contact_name: string;
  platform: 'whatsapp' | 'instagram' | 'linkedin' | 'email';
  draft_content: string;
  original_message?: string;
  contact_identifier?: string; // Phone number, email, username, etc.
}

interface ReviewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: DraftMessage[];
  onSend: (id: string, content: string) => Promise<void>;
  onSkip: (id: string) => Promise<void>;
}

// --- MAGIC LINK LOGIK ---
const openDeepLink = (platform: string, contact: string, text: string, contactIdentifier?: string): void => {
  const encodedText = encodeURIComponent(text);
  let url = '';

  switch (platform) {
    case 'whatsapp':
      // Prüft ob contact eine Nummer ist oder contact_identifier verwendet
      const phoneNumber = contactIdentifier || contact;
      const isNumber = /^[+\d]+$/.test(phoneNumber.replace(/\s/g, ''));
      if (isNumber) {
        url = `https://wa.me/${phoneNumber.replace(/\s/g, '')}?text=${encodedText}`;
      } else {
        // Öffnet WhatsApp ohne Nummer, User wählt Kontakt
        url = `https://wa.me/?text=${encodedText}`;
      }
      break;

    case 'instagram':
      // Instagram: Profil öffnen + Text kopieren
      const username = contactIdentifier || contact.replace('@', '');
      url = `https://www.instagram.com/${username}/`;
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Text in Zwischenablage kopiert!');
      });
      break;

    case 'linkedin':
      // LinkedIn: Messaging öffnen + Text kopieren
      url = `https://www.linkedin.com/messaging/`;
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Text in Zwischenablage kopiert!');
      });
      break;

    case 'email':
      const email = contactIdentifier || contact;
      url = `mailto:${email}?body=${encodedText}`;
      break;

    default:
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Text in Zwischenablage kopiert!');
      });
      return;
  }

  if (url) {
    window.open(url, '_blank');
  }
};

export default function ReviewOverlay({ 
  isOpen, 
  onClose, 
  drafts, 
  onSend, 
  onSkip 
}: ReviewOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentDraft = drafts[currentIndex];
  const progress = drafts.length > 0 ? ((currentIndex + 1) / drafts.length) * 100 : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentDraft) {
      setEditContent(currentDraft.draft_content);
      setIsEditing(false);
    }
  }, [currentDraft]);

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    if (!isOpen || isEditing || isProcessing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          if (!e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip();
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          setIsEditing(true);
          break;
        case 'Escape':
          if (isEditing) {
            setIsEditing(false);
            setEditContent(currentDraft?.draft_content || '');
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, isEditing, currentDraft, isProcessing]);

  // --- ACTIONS ---
  const handleSend = async () => {
    if (!currentDraft || isProcessing) return;

    setIsProcessing(true);
    const finalContent = isEditing ? editContent : currentDraft.draft_content;
    
    try {
      // 1. Magic Link öffnen
      openDeepLink(
        currentDraft.platform, 
        currentDraft.contact_name, 
        finalContent,
        currentDraft.contact_identifier
      );

      // 2. Als gesendet markieren
      await onSend(currentDraft.id, finalContent);

      // 3. Weiter
      nextItem();
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Fehler beim Senden');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (!currentDraft || isProcessing) return;

    setIsProcessing(true);
    try {
      await onSkip(currentDraft.id);
      nextItem();
    } catch (error) {
      console.error('Skip error:', error);
      toast.error('Fehler beim Überspringen');
    } finally {
      setIsProcessing(false);
    }
  };

  const nextItem = () => {
    if (currentIndex < drafts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Fertig!
      toast.success('🎉 Alle Drafts bearbeitet!');
      onClose();
    }
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  if (!isOpen || !mounted || !currentDraft) return null;

  const platformEmoji = {
    whatsapp: '📱',
    instagram: '📸',
    linkedin: '💼',
    email: '📧'
  };

  const platformName = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    email: 'Email'
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#0B0F19] flex flex-col font-sans text-white">
      
      {/* HEADER */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#131825]">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            CHIEF Flow
          </h2>
          <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs font-mono border border-gray-700">
            {currentIndex + 1} / {drafts.length}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-500">
          <div className="hidden md:flex items-center gap-2">
            <kbd className="bg-gray-800 px-2 py-1 rounded border border-gray-700 text-gray-300 font-mono text-xs">ENTER</kbd>
            <span>Senden</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <kbd className="bg-gray-800 px-2 py-1 rounded border border-gray-700 text-gray-300 font-mono text-xs">→</kbd>
            <span>Skip</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <kbd className="bg-gray-800 px-2 py-1 rounded border border-gray-700 text-gray-300 font-mono text-xs">E</kbd>
            <span>Edit</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-800 rounded-full transition-colors ml-4"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="w-full bg-gray-900 h-1">
        <div
          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: CONTACT INFO */}
        <div className="w-1/3 border-r border-gray-800 bg-[#0F1420] p-8 flex flex-col justify-center">
          <div className="text-center">
            {/* Avatar */}
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-4xl font-bold text-white mb-6 shadow-2xl">
              {currentDraft.contact_name.charAt(0).toUpperCase()}
            </div>

            {/* Name */}
            <h2 className="text-2xl font-bold text-white mb-2">
              {currentDraft.contact_name}
            </h2>

            {/* Platform */}
            <div className="flex items-center justify-center gap-2 text-cyan-400 font-medium text-sm mb-8">
              {platformEmoji[currentDraft.platform]} {platformName[currentDraft.platform]}
            </div>

            {/* Original Message */}
            {currentDraft.original_message && (
              <div className="bg-[#1A202C] border border-gray-700/50 p-4 rounded-xl text-left">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                  Letzte Nachricht
                </span>
                <p className="text-gray-400 italic text-sm">
                  "{currentDraft.original_message}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: DRAFT */}
        <div className="flex-1 bg-[#0B0F19] p-12 flex flex-col justify-center items-center">
          <div className="w-full max-w-2xl space-y-6">
            
            {/* Label */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest">
                CHIEF Entwurf {isEditing && '(Bearbeiten)'}
              </span>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-500 hover:text-white flex items-center gap-1 text-xs transition-colors"
                  disabled={isProcessing}
                >
                  <Edit3 size={12} /> Bearbeiten
                </button>
              )}
            </div>

            {/* Message Box */}
            <div
              className={`bg-[#131825] border rounded-2xl p-6 min-h-[200px] transition-all ${
                isEditing 
                  ? 'border-cyan-500 ring-2 ring-cyan-500/20' 
                  : 'border-gray-700 hover:border-gray-600 cursor-pointer'
              }`}
              onClick={() => !isEditing && !isProcessing && setIsEditing(true)}
            >
              {isEditing ? (
                <div className="space-y-4">
                  <textarea
                    autoFocus
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-transparent text-lg text-white outline-none resize-none leading-relaxed min-h-[150px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsEditing(false);
                        setEditContent(currentDraft.draft_content);
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(currentDraft.draft_content);
                      }}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                      disabled={isProcessing}
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 rounded-lg"
                      disabled={isProcessing}
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-lg text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {editContent || currentDraft.draft_content}
                </p>
              )}
            </div>

            {/* Hint for Instagram/LinkedIn */}
            {(currentDraft.platform === 'instagram' || currentDraft.platform === 'linkedin') && (
              <p className="text-xs text-gray-500 text-center">
                💡 Text wird kopiert. Drücke <span className="text-gray-400">STRG+V</span> im Chat.
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSkip}
                disabled={isProcessing}
                className="px-8 py-4 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward size={18} /> Skip
              </button>

              <button
                onClick={handleSend}
                disabled={isProcessing}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  'Verarbeitung...'
                ) : (
                  <>
                    Senden & Öffnen <ExternalLink size={20} />
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-gray-600">
              <span className="text-gray-400 font-mono">ENTER</span> zum Bestätigen
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

