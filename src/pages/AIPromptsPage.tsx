import React, { useState } from 'react';
import { 
  MessageSquare, 
  ShieldAlert, 
  Zap, 
  Send, 
  Settings2, 
  Smartphone, 
  AlertTriangle,
  Edit2,
  Mail
} from 'lucide-react';

// Prompt Action Row Component
const PromptActionRow = ({ icon: Icon, title, description, isActive, onEdit }: {
  icon: React.ElementType;
  title: string;
  description: string;
  isActive: boolean;
  onEdit?: () => void;
}) => (
  <div className="group flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-teal-500/50 transition-all cursor-pointer">
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${isActive ? 'bg-teal-500/20 text-teal-400' : 'bg-gray-700 text-gray-400'}`}>
        <Icon size={20} />
      </div>
      <div>
        <h4 className="text-white font-medium text-sm">{title}</h4>
        <p className="text-gray-500 text-xs mt-0.5">{description}</p>
      </div>
    </div>
    
    <button 
      onClick={onEdit}
      className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <Edit2 size={16} />
    </button>
  </div>
);

// Chat Preview Component
const ChatPreview = () => (
  <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
    {/* Preview Header */}
    <div className="bg-teal-600 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white">
          <MessageSquare size={16} />
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm">Al</h4>
          <p className="text-teal-100 text-xs">Powered by GPT-4</p>
        </div>
      </div>
      <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
        Preview
      </span>
    </div>

    {/* Chat Area */}
    <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-900/50">
      {/* Bot Message */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-600/20 flex items-center justify-center shrink-0">
          <MessageSquare size={14} className="text-teal-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg rounded-tl-none max-w-[85%]">
          <p className="text-gray-300 text-sm leading-relaxed">
            Hallo! Ich bin dein Sales-KI-Assistent. Wie kann ich dir heute helfen?
          </p>
        </div>
      </div>

      {/* Interactive Options */}
      <div className="space-y-2 pl-11">
        <button className="w-full text-left p-3 rounded-lg border border-teal-500/30 bg-teal-500/5 text-teal-300 text-sm hover:bg-teal-500/10 transition-colors">
          🛡️ Einwand behandeln
        </button>
        <button className="w-full text-left p-3 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 text-sm hover:border-gray-600 transition-colors">
          📧 E-Mail schreiben
        </button>
        <button className="w-full text-left p-3 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 text-sm hover:border-gray-600 transition-colors">
          📱 WhatsApp senden
        </button>
      </div>
    </div>

    {/* Input Area */}
    <div className="p-4 border-t border-gray-800 bg-gray-900">
      <div className="relative">
        <input 
          type="text" 
          placeholder="Schreibe eine Nachricht..." 
          disabled
          className="w-full bg-gray-950 border border-gray-700 rounded-lg py-3 px-4 text-sm text-gray-500 focus:outline-none cursor-not-allowed"
        />
        <button disabled className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-600">
          <Send size={16} />
        </button>
      </div>
      <p className="text-center text-xs text-gray-600 mt-2">Preview Modus - Eingabe deaktiviert</p>
    </div>
  </div>
);

export default function AIPromptsPage() {
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo');
  const [systemPrompt, setSystemPrompt] = useState('Du bist ein professioneller Sales-Assistent. Dein Ziel ist es, Einwände höflich zu behandeln und Termine zu vereinbaren.');

  // Check WhatsApp status (can be fetched from API)
  React.useEffect(() => {
    // TODO: Fetch WhatsApp connection status from API
    // For now, default to false
    setWhatsappConnected(false);
  }, []);

  const handleEditPrompt = (promptType: string) => {
    console.log('Edit prompt:', promptType);
    // TODO: Open edit modal
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">AI Prompts & Chat Konfiguration</h1>
        <p className="text-gray-400 mt-1">Konfiguriere das Verhalten deines KI-Assistenten und verwalte die Antwort-Optionen.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LINKS: Konfiguration */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Global AI Settings Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings2 className="text-teal-500" size={20} />
              <h3 className="text-white font-semibold">Generelle Einstellungen</h3>
            </div>

            <div className="space-y-4">
              {/* Model Selection */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  KI Modell
                </label>
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-2.5 focus:border-teal-500 outline-none"
                >
                  <option value="gpt-4-turbo">GPT-4 Turbo (Empfohlen)</option>
                  <option value="gpt-4o-mini">GPT-4o-mini (Schneller)</option>
                  <option value="groq-llama-3.3">Groq Llama 3.3 (Kostenlos)</option>
                </select>
              </div>
              
              {/* System Prompt */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  System Persona
                </label>
                <textarea 
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 text-sm focus:border-teal-500 outline-none min-h-[80px]"
                  placeholder="Du bist ein hilfreicher Sales-Assistent..."
                />
              </div>
            </div>
          </div>

          {/* 2. Integration Alert (nur wenn WhatsApp fehlt) */}
          {!whatsappConnected && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 flex items-start gap-4">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-red-400 font-medium text-sm">WhatsApp Integration fehlt</h4>
                <p className="text-red-400/70 text-sm mt-1 mb-3">
                  Der Assistent kann keine WhatsApp Nachrichten senden, da die API Keys fehlen.
                </p>
                <button className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded transition-colors border border-red-500/30">
                  Jetzt konfigurieren
                </button>
              </div>
            </div>
          )}

          {/* 3. Active Prompts List */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Zap className="text-teal-500" size={20} />
                <h3 className="text-white font-semibold">Aktive Prompts</h3>
              </div>
              <button className="text-xs text-teal-400 font-medium hover:text-teal-300">
                + Neuen Prompt
              </button>
            </div>

            <div className="space-y-3">
              <PromptActionRow 
                icon={ShieldAlert} 
                title="Einwand behandeln" 
                description="Generiert Antworten auf gängige Kunden-Einwände."
                isActive={true}
                onEdit={() => handleEditPrompt('objection')}
              />
              <PromptActionRow 
                icon={Mail} 
                title="E-Mail schreiben" 
                description="Erstellt Follow-up E-Mails basierend auf Kontext."
                isActive={true}
                onEdit={() => handleEditPrompt('email')}
              />
              <PromptActionRow 
                icon={Smartphone} 
                title="WhatsApp senden" 
                description="Kurze Nachrichten für schnelle Kommunikation."
                isActive={whatsappConnected}
                onEdit={() => handleEditPrompt('whatsapp')}
              />
            </div>
          </div>

        </div>

        {/* RECHTS: Live Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-gray-400 text-sm font-medium">Live Vorschau</h3>
              <span className="text-xs text-gray-600">Aktualisiert automatisch</span>
            </div>
            <ChatPreview />
            
            <div className="mt-4 p-4 bg-gray-900 border border-gray-800 rounded-lg">
              <h4 className="text-white text-sm font-medium mb-2">Statistik</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-2xl font-bold text-teal-500">12</span>
                  <p className="text-gray-500 text-xs">Aktive Templates</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-white">GPT-4</span>
                  <p className="text-gray-500 text-xs">Aktuelles Modell</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
