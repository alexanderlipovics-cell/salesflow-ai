// Sales Scripts für verschiedene Verticals und Kanäle
// Perfekt formatiert für schnelle Outreach-Kampagnen

export type Vertical = 'network' | 'immo' | 'finance' | 'generic';
export type Channel = 'whatsapp' | 'call';

export type SalesScript = {
  [K in Vertical]: {
    [C in Channel]: string;
  };
};

export const SALES_SCRIPTS: SalesScript = {
  network: {
    whatsapp: "Hey [Name], kurzes Intro: Bist du offen für neue Projekte oder komplett dicht? 🎯",
    call: "Hi [Name], [DeinName] hier. Ich mach's kurz: Suchst du gerade aktiv nach neuen Partnern oder läuft alles voll? 60 Sekunden, versprochen."
  },
  
  immo: {
    whatsapp: "Moin [Name], [DeinName] – Quick Question: Planst du neue Objekte oder läuft's bei dir schon auf Hochtouren? 🏡",
    call: "Hi [Name], [DeinName] hier. Ganz direkt: Bist du offen für ein Gespräch über neue Vertriebswege im Immobilien-Bereich? Dauert 2 Minuten."
  },
  
  finance: {
    whatsapp: "Hi [Name], [DeinName] – kurze Frage: Wie offen bist du aktuell für neue Finanzprodukte in deinem Portfolio? 💼",
    call: "Hallo [Name], [DeinName] hier. Direkter Check: Prüfst du gerade neue Finanzlösungen für deine Kunden oder ist dein Setup bereits komplett?"
  },
  
  generic: {
    whatsapp: "Hi [Name], [DeinName] hier. Passt es gerade kurz? 🚀",
    call: "Hi [Name], [DeinName] hier. Ich mach's ganz kurz – hast du 60 Sekunden?"
  }
};

// Hilfsfunktion: Script für einen Lead holen (mit Fallback auf 'generic')
export function getScript(vertical: Vertical, channel: Channel): string {
  // Fallback auf 'generic', falls der Vertical nicht existiert
  const validVertical: Vertical = SALES_SCRIPTS[vertical] ? vertical : 'generic';
  return SALES_SCRIPTS[validVertical]?.[channel] ?? SALES_SCRIPTS.generic[channel];
}

// Hilfsfunktion: Script mit Namen personalisieren
export function personalizeScript(script: string, name: string, yourName?: string): string {
  let result = script.replace(/\[Name\]/g, name);
  if (yourName) {
    result = result.replace(/\[DeinName\]/g, yourName);
  }
  return result;
}

