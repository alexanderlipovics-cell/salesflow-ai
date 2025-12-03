import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, Copy, ExternalLink, RefreshCw, Send, Search, User } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // PFAD GGF. ANPASSEN (z.B. ../../supabaseClient)

// Typen
type Vertical = 'immo' | 'network' | 'finance' | 'coaching' | 'generic';
type Tone = 'du' | 'sie';

interface Contact {
  id: string;
  name: string;
  phone: string | null;
  vertical?: string;
}

interface DelayMasterPanelProps {
  className?: string;
}

export const DelayMasterPanel: React.FC<DelayMasterPanelProps> = ({ className }) => {
  // UI State
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [vertical, setVertical] = useState<Vertical>('generic');
  const [tone, setTone] = useState<Tone>('du');
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // CRM / Contact State
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // 1. Suche in Supabase, wenn man tippt
  useEffect(() => {
    const searchContacts = async () => {
      if (name.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);

      // Suche in 'leads' Tabelle (pass den Tabellennamen an, falls er 'contacts' heißt)
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, phone, vertical') // Stelle sicher, dass diese Spalten existieren
        .ilike('name', `%${name}%`)
        .limit(5);

      if (!error && data) {
        setSearchResults(data as any[]); // Typisierung entspannt halten für Demo
        setShowDropdown(true);
      }
      setIsSearching(false);
    };

    // Debounce: Nicht bei jedem Tastenschlag sofort feuern
    const timer = setTimeout(searchContacts, 300);
    return () => clearTimeout(timer);
  }, [name]);

  // 2. Kontakt auswählen
  const selectContact = (contact: Contact) => {
    setName(contact.name);
    setSelectedPhone(contact.phone || '');

    // Wenn der Lead eine Branche hat, übernehmen wir sie
    if (contact.vertical && ['immo', 'network', 'finance', 'coaching'].includes(contact.vertical)) {
      setVertical(contact.vertical as Vertical);
    }

    setShowDropdown(false);
    // Nachricht sofort neu generieren
    setTimeout(() => generateMessageWithParams(contact.name, minutes, vertical, tone), 100);
  };

  // 3. Helper: Nummer bereinigen (Leerzeichen, + weg)
  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/[^0-9]/g, '');
  };

  // Templates & Logik
  const generateMessageWithParams = (n: string, m: number, v: string, t: string) => {
    if (!n) return;
    const templates: any = {
      du: {
        immo: `Hi ${n}, stecke kurz im Verkehr fest. Navi sagt +${m} Min. 🚗 Sorry! Starten wir entspannt oder hast du einen harten Anschlag danach?`,
        network: `Hey ${n}, kurze Info: Bin in ca. ${m} Min da. 🕒 Alles entspannt bei dir oder Zeitdruck?`,
        finance: `Hallo ${n}, bitte entschuldige, ich verspäte mich um ca. ${m} Minuten. Bin gleich da! 💼`,
        coaching: `Hi ${n}, kleiner Delay von ${m} Min. Nutzen wir die Zeit kurz zum Durchatmen, bin gleich bei dir! ✨`,
        generic: `Hi ${n}, ich verspäte mich leider um ${m} Minuten. Sorry! Hoffe das passt noch?`,
      },
      sie: {
        immo: `Guten Tag Herr/Frau ${n}, ich bitte um kurze Entschuldigung: Aufgrund der Verkehrslage verspäte ich mich um ca. ${m} Minuten.`,
        network: `Hallo ${n}, ich werde ca. ${m} Minuten später eintreffen. Ich bitte die Verzögerung zu entschuldigen.`,
        finance: `Guten Tag Herr/Frau ${n}, kleiner Stau – ich bin in ${m} Minuten bei Ihnen. Danke für Ihre Geduld.`,
        coaching: `Hallo ${n}, ich benötige noch ca. ${m} Minuten. Wir starten dann direkt durch.`,
        generic: `Guten Tag ${n}, ich verspäte mich leider um ca. ${m} Minuten. Bin gleich vor Ort.`,
      }
    };
    const msg = templates[t][v] || templates[t]['generic'];
    setGeneratedMsg(msg);
    setCopied(false);
  };

  // Trigger bei manuellen Änderungen
  useEffect(() => {
    if (name) generateMessageWithParams(name, minutes, vertical, tone);
  }, [minutes, vertical, tone]); // Name nehmen wir hier raus, um Loop mit Dropdown zu vermeiden

  // WhatsApp Link Builder (mit echter Nummer!)
  const getWhatsAppLink = () => {
    const text = encodeURIComponent(generatedMsg);
    if (selectedPhone) {
      const cleanNumber = formatPhoneNumber(selectedPhone);
      return `https://wa.me/${cleanNumber}?text=${text}`;
    }
    // Fallback ohne Nummer
    return `https://wa.me/?text=${text}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 text-emerald-400">
        <Clock className="w-6 h-6" />
        <h2 className="text-xl font-bold text-white">Delay Master</h2>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* SMART CONTACT SEARCH */}
          <div className="space-y-1 relative">
            <label className="text-xs text-slate-400 uppercase font-semibold tracking-wider flex justify-between">
              Kunden Name
              {selectedPhone && <span className="text-emerald-500 text-[10px] flex items-center gap-1"><User className="w-3 h-3" /> Nummer verknüpft</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value === '') setSelectedPhone(''); // Reset phone on clear
                }}
                onFocus={() => name.length >= 2 && setShowDropdown(true)}
                placeholder="Name suchen..."
                className={`w-full bg-slate-800 border ${selectedPhone ? 'border-emerald-500/50' : 'border-slate-600'} rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none`}
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>

            {/* Dropdown Results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                {searchResults.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => selectContact(contact)}
                    className="px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0"
                  >
                    <div className="text-white font-medium">{contact.name}</div>
                    <div className="text-xs text-slate-400 flex justify-between">
                      <span>{contact.vertical || 'Keine Branche'}</span>
                      <span>{contact.phone || 'Keine Nr.'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Overlay um Dropdown zu schließen wenn man wegklickt */}
            {showDropdown && (
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
            )}
          </div>

          {/* Minutes Slider */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Verspätung: {minutes} Min</label>
            <input
              type="range" min="5" max="60" step="5" value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {/* Context Selectors */}
        <div className="flex flex-wrap gap-3">
          <select
            value={vertical}
            onChange={(e) => setVertical(e.target.value as Vertical)}
            className="bg-slate-800 text-sm text-slate-200 border border-slate-600 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
          >
            <option value="generic">Allgemein</option>
            <option value="immo">Immobilien</option>
            <option value="network">Network</option>
            <option value="finance">Finanz</option>
            <option value="coaching">Coaching</option>
          </select>

          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-600">
            <button onClick={() => setTone('du')} className={`px-4 py-1 rounded text-sm font-medium transition-colors ${tone === 'du' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Du</button>
            <button onClick={() => setTone('sie')} className={`px-4 py-1 rounded text-sm font-medium transition-colors ${tone === 'sie' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Sie</button>
          </div>
        </div>

        {/* Message Output */}
        <div className="relative group mt-4">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg opacity-20 group-hover:opacity-40 transition duration-300"></div>
          <div className="relative bg-slate-800 rounded-lg p-4 border border-slate-700">
            <textarea
              value={generatedMsg}
              onChange={(e) => setGeneratedMsg(e.target.value)}
              className="w-full bg-transparent text-slate-200 text-lg leading-relaxed focus:outline-none resize-none h-24"
              placeholder="Wähle einen Kontakt..."
            />

            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700">
              <button onClick={copyToClipboard} className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors font-medium">
                {copied ? <span className="text-emerald-400">Kopiert!</span> : <><Copy className="w-4 h-4" /> Text kopieren</>}
              </button>

              <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2 px-4 rounded-lg transition-colors font-bold shadow-lg shadow-emerald-900/20">
                <Send className="w-4 h-4" />
                {selectedPhone ? 'Senden an Kontakt' : 'WhatsApp öffnen'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};