/**
 * 🪄 Magic Contact Buttons
 * 
 * Intelligente Kontakt-Buttons mit Deep-Link Magic:
 * - Automatisches Kopieren der Nachricht
 * - Öffnet native App direkt im Chat
 * - AI-generierte personalisierte Nachrichten
 * 
 * @author SalesFlow AI
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Instagram,
  Linkedin,
  Facebook,
  Mail,
  Phone,
  Send,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  magicSend,
  getAvailablePlatforms,
  getPlatformName,
  getPlatformColor,
  Platform,
  ContactInfo,
} from '../../services/magicDeepLinkService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface MagicContactButtonsProps {
  contact: ContactInfo;
  defaultMessage?: string;
  aiMessage?: string;
  onMessageSent?: (platform: Platform) => void;
  variant?: 'full' | 'compact' | 'inline';
  showAiSuggestion?: boolean;
  className?: string;
}

interface ButtonState {
  loading: boolean;
  copied: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const PlatformIcons: Record<Platform, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  telegram: Send,
  email: Mail,
  sms: Phone,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAGIC BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const MagicButton: React.FC<{
  platform: Platform;
  contact: ContactInfo;
  message: string;
  onSent?: () => void;
  size?: 'sm' | 'md' | 'lg';
}> = ({ platform, contact, message, onSent, size = 'md' }) => {
  const [state, setState] = useState<ButtonState>({
    loading: false,
    copied: false,
    error: null,
  });
  
  const Icon = PlatformIcons[platform];
  const color = getPlatformColor(platform);
  const name = getPlatformName(platform);
  
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };
  
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };
  
  const handleClick = useCallback(async () => {
    setState({ loading: true, copied: false, error: null });
    
    try {
      const result = await magicSend({
        platform,
        contact,
        message,
        copyFirst: true,
        showToast: true,
      });
      
      if (result.success) {
        setState({ loading: false, copied: true, error: null });
        onSent?.();
        
        // Reset nach 2 Sekunden
        setTimeout(() => {
          setState(s => ({ ...s, copied: false }));
        }, 2000);
      } else {
        setState({ loading: false, copied: false, error: result.error || 'Fehler' });
      }
    } catch (error) {
      setState({
        loading: false,
        copied: false,
        error: error instanceof Error ? error.message : 'Fehler',
      });
    }
  }, [platform, contact, message, onSent]);
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      disabled={state.loading}
      className={`
        ${sizeClasses[size]}
        rounded-xl transition-all duration-200
        flex items-center justify-center gap-2
        text-white font-medium
        shadow-lg hover:shadow-xl
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      style={{ 
        backgroundColor: color,
        boxShadow: `0 4px 14px ${color}40`,
      }}
      title={`Via ${name} senden`}
    >
      {state.loading ? (
        <Loader2 className="animate-spin" size={iconSizes[size]} />
      ) : state.copied ? (
        <Check size={iconSizes[size]} />
      ) : (
        <Icon size={iconSizes[size]} />
      )}
    </motion.button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const MagicContactButtons: React.FC<MagicContactButtonsProps> = ({
  contact,
  defaultMessage = '',
  aiMessage,
  onMessageSent,
  variant = 'full',
  showAiSuggestion = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<'default' | 'ai'>('ai');
  const [customMessage, setCustomMessage] = useState('');
  
  const availablePlatforms = getAvailablePlatforms(contact);
  const activeMessage = customMessage || (selectedMessage === 'ai' && aiMessage ? aiMessage : defaultMessage);
  
  if (availablePlatforms.length === 0) {
    return (
      <div className={`text-center text-gray-400 py-4 ${className}`}>
        <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Keine Kontaktdaten verfügbar</p>
      </div>
    );
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VARIANT: COMPACT (nur Icons)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (variant === 'compact') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {availablePlatforms.slice(0, 4).map(platform => (
          <MagicButton
            key={platform}
            platform={platform}
            contact={contact}
            message={activeMessage}
            onSent={() => onMessageSent?.(platform)}
            size="sm"
          />
        ))}
      </div>
    );
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VARIANT: INLINE (horizontale Leiste)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex gap-1">
          {availablePlatforms.map(platform => (
            <MagicButton
              key={platform}
              platform={platform}
              contact={contact}
              message={activeMessage}
              onSent={() => onMessageSent?.(platform)}
              size="sm"
            />
          ))}
        </div>
        {aiMessage && (
          <div className="flex items-center gap-1 text-xs text-purple-400">
            <Sparkles className="w-3 h-3" />
            <span>AI-Nachricht bereit</span>
          </div>
        )}
      </div>
    );
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VARIANT: FULL (mit Message-Editor)
  // ─────────────────────────────────────────────────────────────────────────────
  
  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Magic Send</h3>
              <p className="text-xs text-slate-400">1-Klick Nachrichten</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </button>
        </div>
      </div>
      
      {/* Expandable Message Editor */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {/* AI vs Default Toggle */}
              {aiMessage && showAiSuggestion && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedMessage('ai')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      selectedMessage === 'ai'
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    AI Nachricht
                  </button>
                  <button
                    onClick={() => setSelectedMessage('default')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedMessage === 'default'
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Standard
                  </button>
                </div>
              )}
              
              {/* Message Preview/Editor */}
              <div className="relative">
                <textarea
                  value={customMessage || activeMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Nachricht eingeben..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
                {customMessage && (
                  <button
                    onClick={() => setCustomMessage('')}
                    className="absolute top-2 right-2 text-slate-500 hover:text-white text-xs"
                  >
                    Reset
                  </button>
                )}
              </div>
              
              {/* Copy Button */}
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(activeMessage);
                }}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Nur kopieren
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Platform Buttons */}
      <div className="p-4 border-t border-slate-700">
        <div className="grid grid-cols-4 gap-2">
          {availablePlatforms.map(platform => (
            <MagicButton
              key={platform}
              platform={platform}
              contact={contact}
              message={activeMessage}
              onSent={() => onMessageSent?.(platform)}
              size="md"
            />
          ))}
        </div>
        
        <p className="text-center text-xs text-slate-500 mt-3">
          Klicke → Nachricht wird kopiert → App öffnet sich
        </p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK MAGIC BUTTON (Einzelner Button mit allem)
// ═══════════════════════════════════════════════════════════════════════════════

export const QuickMagicButton: React.FC<{
  platform: Platform;
  contact: ContactInfo;
  message: string;
  label?: string;
  className?: string;
  onSent?: () => void;
}> = ({ platform, contact, message, label, className = '', onSent }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'copied'>('idle');
  
  const Icon = PlatformIcons[platform];
  const color = getPlatformColor(platform);
  const name = getPlatformName(platform);
  
  const handleClick = async () => {
    setState('loading');
    
    const result = await magicSend({
      platform,
      contact,
      message,
      copyFirst: true,
      showToast: true,
    });
    
    if (result.success) {
      setState('copied');
      onSent?.();
      setTimeout(() => setState('idle'), 2000);
    } else {
      setState('idle');
    }
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      disabled={state === 'loading'}
      className={`
        flex items-center justify-center gap-2 px-4 py-3 rounded-xl
        font-semibold text-white transition-all
        shadow-lg hover:shadow-xl
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{ 
        backgroundColor: color,
        boxShadow: `0 4px 14px ${color}40`,
      }}
    >
      {state === 'loading' ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : state === 'copied' ? (
        <>
          <Check className="w-5 h-5" />
          <span>Kopiert!</span>
        </>
      ) : (
        <>
          <Icon className="w-5 h-5" />
          <span>{label || `Via ${name}`}</span>
        </>
      )}
    </motion.button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default MagicContactButtons;

