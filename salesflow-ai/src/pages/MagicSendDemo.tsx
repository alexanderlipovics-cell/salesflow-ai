/**
 * 🪄 Magic Send Demo Page
 * 
 * Demonstriert die 1-Klick Messaging Funktion:
 * - Nachricht wird automatisch kopiert
 * - App öffnet sich direkt im Chat
 * - 0€ Kosten pro Nachricht!
 * 
 * @author SalesFlow AI
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  MessageCircle,
  Instagram,
  Send,
  Mail,
  Phone,
  Zap,
  ArrowRight,
  Check,
  Copy,
} from 'lucide-react';
import {
  magicSend,
  getAvailablePlatforms,
  getPlatformName,
  getPlatformColor,
  getPlatformEmoji,
  Platform,
  ContactInfo,
} from '../services/magicDeepLinkService';

// Demo Kontakte
const DEMO_CONTACTS: Array<{ contact: ContactInfo; suggested_message: string }> = [
  {
    contact: {
      name: 'Julia Fischer',
      phone: '+491701234567',
      instagram: 'julia_coaching',
      email: 'julia@example.com',
    },
    suggested_message: 'Hey Julia! 👋 Dein Coaching-Content hat mich total inspiriert. Hast du Lust auf einen kurzen Austausch?',
  },
  {
    contact: {
      name: 'Max Müller',
      phone: '+491709876543',
      instagram: 'max_fitness',
    },
    suggested_message: 'Hey Max! 💪 Starker Content! Ich arbeite auch im Fitness-Bereich und würde mich gerne vernetzen.',
  },
  {
    contact: {
      name: 'Sarah Weber',
      instagram: 'sarah_lifestyle',
      email: 'sarah@example.com',
    },
    suggested_message: 'Hi Sarah! ✨ Dein Feed ist mega inspirierend. Was ist dein Geheimnis für so authentischen Content?',
  },
];

const MagicSendDemo = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('whatsapp');
  const [selectedContact, setSelectedContact] = useState(DEMO_CONTACTS[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  
  const activeMessage = customMessage || selectedContact.suggested_message;
  const availablePlatforms = getAvailablePlatforms(selectedContact.contact);
  
  const handleMagicSend = async () => {
    setSendState('sending');
    
    try {
      await magicSend({
        platform: selectedPlatform,
        contact: selectedContact.contact,
        message: activeMessage,
        copyFirst: true,
        showToast: true,
      });
      
      setSendState('sent');
      setTimeout(() => setSendState('idle'), 2000);
    } catch (error) {
      console.error('Magic send error:', error);
      setSendState('idle');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-8 text-white">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-purple-300 font-medium">Magic Deep-Links</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              1-Klick Messaging
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg">
            Nachricht kopieren + App öffnen = <span className="text-emerald-400 font-bold">0€ Kosten</span>
          </p>
        </motion.div>
        
        {/* How it Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6 mb-6"
        >
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            So funktioniert's
          </h2>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-slate-900/50 rounded-xl">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Copy className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-sm text-slate-300">1. Nachricht wird automatisch kopiert</p>
            </div>
            
            <div className="p-4 bg-slate-900/50 rounded-xl">
              <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <ArrowRight className="w-6 h-6 text-pink-400" />
              </div>
              <p className="text-sm text-slate-300">2. App öffnet sich im richtigen Chat</p>
            </div>
            
            <div className="p-4 bg-slate-900/50 rounded-xl">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-300">3. Einfügen & Senden!</p>
            </div>
          </div>
        </motion.div>
        
        {/* Contact Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6 mb-6"
        >
          <h2 className="font-bold text-lg mb-4">Demo-Kontakt auswählen</h2>
          
          <div className="grid gap-3">
            {DEMO_CONTACTS.map((item, index) => (
              <button
                key={index}
                onClick={() => setSelectedContact(item)}
                className={`
                  p-4 rounded-xl text-left transition-all
                  ${selectedContact === item 
                    ? 'bg-purple-500/20 border-2 border-purple-500' 
                    : 'bg-slate-900/50 border-2 border-transparent hover:border-slate-600'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                    {item.contact.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.contact.name}</div>
                    <div className="text-sm text-slate-400 flex gap-2">
                      {item.contact.phone && <span>📱</span>}
                      {item.contact.instagram && <span>📸</span>}
                      {item.contact.email && <span>📧</span>}
                    </div>
                  </div>
                  {selectedContact === item && (
                    <Check className="w-5 h-5 text-purple-400" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
        
        {/* Message Editor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6 mb-6"
        >
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            Nachricht
          </h2>
          
          <textarea
            value={customMessage || selectedContact.suggested_message}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Deine Nachricht..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 h-32"
          />
          
          {customMessage && (
            <button
              onClick={() => setCustomMessage('')}
              className="mt-2 text-sm text-slate-400 hover:text-white"
            >
              ↩️ Zurücksetzen
            </button>
          )}
        </motion.div>
        
        {/* Platform Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6 mb-6"
        >
          <h2 className="font-bold text-lg mb-4">Plattform wählen</h2>
          
          <div className="grid grid-cols-4 gap-3">
            {availablePlatforms.map(platform => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`
                  p-4 rounded-xl text-center transition-all
                  ${selectedPlatform === platform 
                    ? 'ring-2 ring-offset-2 ring-offset-slate-800' 
                    : 'hover:bg-slate-700/50'
                  }
                `}
                style={{
                  backgroundColor: selectedPlatform === platform 
                    ? getPlatformColor(platform) + '30' 
                    : undefined,
                  borderColor: selectedPlatform === platform 
                    ? getPlatformColor(platform) 
                    : undefined,
                }}
              >
                <div className="text-3xl mb-1">{getPlatformEmoji(platform)}</div>
                <div className="text-sm font-medium">{getPlatformName(platform)}</div>
              </button>
            ))}
          </div>
          
          {availablePlatforms.length === 0 && (
            <div className="text-center text-slate-400 py-4">
              Keine Plattformen verfügbar für diesen Kontakt
            </div>
          )}
        </motion.div>
        
        {/* Send Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={handleMagicSend}
            disabled={sendState === 'sending' || availablePlatforms.length === 0}
            className={`
              w-full py-5 rounded-2xl font-bold text-lg transition-all
              flex items-center justify-center gap-3
              shadow-lg hover:shadow-xl
              disabled:opacity-50 disabled:cursor-not-allowed
              ${sendState === 'sent' 
                ? 'bg-emerald-500' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              }
            `}
          >
            {sendState === 'sending' ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Wird geöffnet...
              </>
            ) : sendState === 'sent' ? (
              <>
                <Check className="w-6 h-6" />
                Kopiert & App geöffnet!
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Magic Send via {getPlatformName(selectedPlatform)}
              </>
            )}
          </button>
          
          <p className="text-center text-slate-500 text-sm mt-4">
            💡 Die Nachricht wird in die Zwischenablage kopiert und {getPlatformName(selectedPlatform)} öffnet sich automatisch
          </p>
        </motion.div>
        
        {/* Cost Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/30 p-6"
        >
          <h3 className="font-bold text-emerald-400 mb-3">💰 Kostenvergleich</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
              <div className="text-red-400 font-bold mb-1">WhatsApp Business API</div>
              <div className="text-2xl font-bold text-white">11-13 Cent</div>
              <div className="text-sm text-slate-400">pro Nachricht</div>
            </div>
            
            <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
              <div className="text-emerald-400 font-bold mb-1">Magic Deep-Links</div>
              <div className="text-2xl font-bold text-white">0,00 €</div>
              <div className="text-sm text-slate-400">pro Nachricht</div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <span className="text-slate-300">200 Nachrichten/Monat = </span>
            <span className="text-red-400 line-through">26€</span>
            <span className="text-emerald-400 font-bold"> → 0€</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MagicSendDemo;

