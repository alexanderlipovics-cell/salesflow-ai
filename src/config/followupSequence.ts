/**
 * Follow-up Sequence Configuration
 * 
 * Definiert die Standard-Follow-up-Sequenz mit allen Templates,
 * Phasen, Zeitoffsets und Default-Nachrichten.
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type FollowUpPhase = 'followup' | 'reactivation' | 'loop';

export type FollowUpChannel = 'whatsapp' | 'instagram' | 'email';

export type LeadVertical = 'network' | 'real_estate' | 'finance' | 'generic';

export type FollowUpStepKey =
  | 'initial_contact'
  | 'fu_1_bump'
  | 'fu_2_value'
  | 'fu_3_decision'
  | 'fu_4_last_touch'
  | 'rx_1_update'
  | 'rx_2_value_asset'
  | 'rx_3_yearly_checkin'
  | 'rx_loop_checkin';

export type FollowUpTemplate = {
  key: FollowUpStepKey;
  label: string;
  description: string;
  phase: FollowUpPhase;
  offsetDays?: number;
  intervalDays?: number;
  defaultChannel: FollowUpChannel;
  defaultMessage: string;
  /** Optionale spezielle Texte pro Vertical (überschreibt defaultMessage) */
  perVerticalMessages?: Partial<Record<LeadVertical, string>>;
};

// ─────────────────────────────────────────────────────────────────
// Standard Follow-up Sequence
// ─────────────────────────────────────────────────────────────────

export const STANDARD_FOLLOW_UP_SEQUENCE: FollowUpTemplate[] = [
  {
    key: 'initial_contact',
    phase: 'followup',
    offsetDays: 0,
    label: 'Erstkontakt',
    description: 'Erste Nachricht – Kontext + Nutzen + einfache Frage.',
    defaultChannel: 'whatsapp',
    defaultMessage:
      'Hey {{name}}, ich bin Alex von Sales Flow AI. Ich helfe Vertriebsteams dabei, ihre Follow-ups zu automatisieren, ohne wie ein Bot zu wirken. Kurze Frage: Wie organisiert ihr aktuell eure Nachfass-Nachrichten?',
    perVerticalMessages: {
      network:
        'Hey {{name}}, ich bin Alex von Sales Flow AI. Ich arbeite mit Network-Teams, die ihre Nachfass-Nachrichten strukturierter und automatisiert machen wollen, ohne dass es unpersönlich wirkt. Kurze Frage: Wie organisiert ihr aktuell eure Follow-ups im Team?',
      real_estate:
        'Hey {{name}}, ich bin Alex von Sales Flow AI. Ich helfe Maklerbüros dabei, Interessenten nach Exposés und Besichtigungen systematisch nachzuverfolgen, damit keine Anfragen mehr liegen bleiben. Wie organisiert ihr aktuell eure Nachfass-Nachrichten bei Immobilienanfragen?',
      finance:
        'Hey {{name}}, ich bin Alex von Sales Flow AI. Ich unterstütze Finanzberater und Agenturen dabei, Beratungstermine und Angebotsnachfassungen zu automatisieren – ohne wie ein Bot zu wirken. Wie läuft euer Follow-up aktuell nach Erstgesprächen?',
    },
  },
  {
    key: 'fu_1_bump',
    phase: 'followup',
    offsetDays: 1,
    label: 'Follow-up 1 – Bump',
    description: 'Sehr kurzer Check, ob die Nachricht gesehen wurde.',
    defaultChannel: 'whatsapp',
    defaultMessage:
      'Hey {{name}}, nur kurz nachfragen, ob meine letzte Nachricht bei dir angekommen ist 😊',
    perVerticalMessages: {
      network:
        'Hey {{name}}, wollte nur kurz checken, ob meine Nachricht gestern bei dir angekommen ist? 😊',
      real_estate:
        'Hey {{name}}, kurze Frage: Hast du meine Nachricht von gestern gesehen? 😊',
      finance:
        'Hey {{name}}, nur kurz nachgehakt – ist meine letzte Nachricht bei dir angekommen? 😊',
    },
  },
  {
    key: 'fu_2_value',
    phase: 'followup',
    offsetDays: 3,
    label: 'Follow-up 2 – Mehrwert',
    description: 'Kurzbeispiel / Mehrwert bringen, nicht nur erinnern.',
    defaultChannel: 'whatsapp',
    defaultMessage:
      'Kurzer Nachtrag, {{name}}: Ein Team wie eures konnte mit einem klaren Follow-up-System 2–3 zusätzliche Abschlüsse pro Monat holen – nur, weil niemand mehr vergessen wurde. Wäre sowas grundsätzlich interessant für euch?',
    perVerticalMessages: {
      network:
        'Kurzer Nachtrag, {{name}}: Viele Network-Teams verlieren Abschlüsse, weil Kontakte nach einem guten Erstgespräch einfach im Chat nach unten rutschen. Mit einem klaren Follow-up-System holen sie 2–3 zusätzliche Partner/Kunden pro Monat rein – nur weil niemand mehr vergessen wird. Wäre sowas grundsätzlich interessant für euer Team?',
      real_estate:
        'Kurzer Nachtrag, {{name}}: Einige Makler, mit denen ich arbeite, haben ihre Abschlüsse erhöht, weil sie strukturiert nach Exposé-Versand und Besichtigungen nachfassen – automatisiert, aber trotzdem persönlich. Könnte so etwas für euer Büro spannend sein?',
      finance:
        'Kurzer Nachtrag, {{name}}: Finanzteams, die ihre Nachfass-Nachrichten nach Beratungsterminen strukturiert automatisieren, sehen oft mehr wahrgenommene Termine und klare Entscheidungen beim Kunden. Wäre das grundsätzlich ein Thema für eure Beratung?',
    },
  },
  {
    key: 'fu_3_decision',
    phase: 'followup',
    offsetDays: 7,
    label: 'Follow-up 3 – Entscheidung',
    description: 'Respektvoller Entscheidungs-Impuls, Ja/Nein reicht.',
    defaultChannel: 'whatsapp',
    defaultMessage:
      'Damit ich deinen Chat nicht unnötig voll mache: Ist das Thema KI-gestütztes Follow-up für euch grundsätzlich spannend oder eher nicht? Ein kurzes Ja/Nein reicht mir 😊',
    perVerticalMessages: {
      network:
        'Damit ich deinen Chat nicht spamme, {{name}}: Ist strukturiertes Follow-up für euer Network-Team grundsätzlich ein Thema oder eher nicht? Ein kurzes Ja/Nein reicht 😊',
      real_estate:
        'Damit ich nicht unnötig nerve, {{name}}: Ist automatisiertes Follow-up für eure Immobilienanfragen interessant oder aktuell kein Thema? Ein kurzes Ja/Nein reicht mir 😊',
      finance:
        'Damit ich deinen Chat nicht überfülle, {{name}}: Ist das Thema automatisierte Nachfass-Kommunikation für eure Beratung spannend oder gerade nicht relevant? Ein kurzes Ja/Nein reicht 😊',
    },
  },
  {
    key: 'fu_4_last_touch',
    phase: 'followup',
    offsetDays: 14,
    label: 'Follow-up 4 – Letzte aktive Nachricht',
    description: 'Tür offen lassen, aber ankündigen, dass du nicht weiter pushst.',
    defaultChannel: 'whatsapp',
    defaultMessage:
      'Ich meld mich nach dieser Nachricht nicht mehr aktiv bei dir, {{name}}. Wenn das Thema später besser passt oder ihr gerade euer Vertriebssystem neu denkt, schreib mir einfach jederzeit.',
    perVerticalMessages: {
      network:
        'Ich meld mich nach dieser Nachricht nicht mehr aktiv, {{name}}. Wenn das Thema Follow-up-Automatisierung für euer Network-Team später besser passt, schreib mir einfach jederzeit.',
      real_estate:
        'Ich meld mich nach dieser Nachricht erstmal nicht mehr, {{name}}. Wenn ihr irgendwann eure Immobilien-Leads strukturierter nachfassen wollt, weißt du ja, wo du mich findest.',
      finance:
        'Ich meld mich nach dieser Nachricht nicht mehr aktiv bei dir, {{name}}. Wenn das Thema automatisierte Kundenkommunikation für eure Beratung später interessant wird, schreib mir gern.',
    },
  },
  {
    key: 'rx_1_update',
    phase: 'reactivation',
    offsetDays: 60,
    label: 'Reaktivierung 1 – Update',
    description: 'Kurzes Update / Praxisbeispiel nach ein paar Wochen.',
    defaultChannel: 'whatsapp',
    defaultMessage:
      'Hey {{name}}, kleines Update aus der Praxis: Wir haben gerade ein Team onboardet, das durch automatisierte Follow-ups seine Abschlussquote deutlich hochgezogen hat. Wenn du irgendwann sehen willst, wie das für euer Setup aussehen könnte, sag gern Bescheid.',
    perVerticalMessages: {
      network:
        'Hey {{name}}, kleines Update: Ein Network-Team hat letzte Woche gestartet und strukturiert jetzt ihre Partner-Gespräche automatisch nach. Die haben schon erste Ergebnisse. Wenn du sehen willst, wie das für euch aussehen könnte, sag Bescheid.',
      real_estate:
        'Hey {{name}}, kurzes Update: Ein Maklerbüro, das vor 2 Monaten gestartet hat, verfolgt jetzt automatisiert alle Interessenten nach Exposé-Versand – und schließt deutlich mehr ab. Könnte für euch auch spannend sein.',
      finance:
        'Hey {{name}}, kleines Update aus der Praxis: Eine Finanzberatung hat kürzlich mit automatisierten Follow-ups begonnen und sieht schon mehr Termin-Wahrnehmungen. Wenn du schauen willst, wie das bei euch laufen könnte, sag Bescheid.',
    },
  },
  {
    key: 'rx_2_value_asset',
    phase: 'reactivation',
    offsetDays: 120,
    label: 'Reaktivierung 2 – Mehrwert-Asset',
    description: 'Wertstück anbieten (z.B. Checkliste oder kurzer Leitfaden).',
    defaultChannel: 'whatsapp',
    defaultMessage:
      'Ich hab einen kurzen Leitfaden gebaut: "Die 5 größten Follow-up-Fehler, die 90 % der Teams machen". Wenn du möchtest, schick ich dir den gern rüber – kostet nix, hilft aber beim Strukturieren 😊',
    perVerticalMessages: {
      network:
        'Ich hab eine kurze Checkliste gebaut: "Die 5 größten Follow-up-Fehler im Network Marketing". Wenn du möchtest, schick ich dir die gern rüber – kostet nix, hilft aber beim Strukturieren 😊',
      real_estate:
        'Ich hab einen kurzen Leitfaden für Makler gebaut: "Die 5 größten Fehler beim Nachfassen von Immobilienanfragen". Soll ich dir den mal schicken? Kostenlos, aber hilfreich 😊',
      finance:
        'Ich hab einen kurzen Leitfaden für Finanzberater gebaut: "Die 5 größten Follow-up-Fehler nach Beratungsgesprächen". Wenn du möchtest, schick ich dir den gern – kostet nix 😊',
    },
  },
  {
    key: 'rx_3_yearly_checkin',
    phase: 'reactivation',
    offsetDays: 300,
    label: 'Reaktivierung 3 – Jahres-Check-in',
    description: 'Persönlicher Jahres-Check-in.',
    defaultChannel: 'whatsapp',
    defaultMessage:
      'Schon eine Weile her, {{name}} 🙈 Wie läuft es aktuell bei euch im Vertrieb? Haben sich eure Prioritäten verändert oder ist das Thema Automatisierung momentan eher vom Tisch?',
    perVerticalMessages: {
      network:
        'Schon eine Weile her, {{name}} 🙈 Wie läuft es aktuell bei euch im Network-Team? Haben sich eure Prioritäten verändert oder ist das Thema automatisiertes Follow-up wieder aktuell?',
      real_estate:
        'Schon eine Weile her, {{name}} 🙈 Wie läuft es aktuell bei euch im Maklerbüro? Ist das Thema strukturiertes Nachfassen von Anfragen inzwischen relevanter?',
      finance:
        'Schon eine Weile her, {{name}} 🙈 Wie läuft es aktuell in eurer Beratung? Haben sich eure Prioritäten geändert oder ist das Thema automatisierte Kundenkommunikation wieder ein Thema?',
    },
  },
  {
    key: 'rx_loop_checkin',
    phase: 'loop',
    intervalDays: 180,
    label: 'Regelmäßiger Check-in',
    description: 'Halbjährlicher Check-in mit kleinem Update.',
    defaultChannel: 'whatsapp',
    defaultMessage:
      'Kurzer Check-in, {{name}}: In den letzten Monaten hat sich im Bereich KI und Vertrieb wieder viel getan. Wenn ihr eure Prozesse irgendwann upgraden wollt, kann ich dir in 10 Minuten zeigen, was heute möglich ist.',
    perVerticalMessages: {
      network:
        'Kurzer Check-in, {{name}}: In den letzten Monaten hat sich im Bereich KI und Network Marketing viel getan. Wenn ihr eure Team-Prozesse upgraden wollt, zeig ich dir gern in 10 Minuten, was heute möglich ist.',
      real_estate:
        'Kurzer Check-in, {{name}}: Im Bereich Immobilien-CRM und Automatisierung hat sich in letzter Zeit viel getan. Wenn ihr eure Anfragen-Nachverfolgung verbessern wollt, kann ich dir in 10 Minuten zeigen, was heute möglich ist.',
      finance:
        'Kurzer Check-in, {{name}}: Im Bereich Finanzberatung und Automatisierung hat sich in den letzten Monaten viel getan. Wenn ihr eure Kundenkommunikation optimieren wollt, zeig ich dir gern in 10 Minuten, was heute möglich ist.',
    },
  },
];

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Sucht in der Standard-Sequenz nach dem Template mit dem gegebenen Key.
 * @param key - Der Template-Key (z.B. 'fu_1_bump')
 * @returns Das gefundene Template oder undefined
 */
export function getFollowUpTemplateByKey(key?: string | null): FollowUpTemplate | undefined {
  if (!key) return undefined;
  return STANDARD_FOLLOW_UP_SEQUENCE.find((template) => template.key === key);
}

/**
 * Mappt einen beliebigen Vertical-String auf das LeadVertical-Enum.
 * Unterstützt verschiedene Schreibweisen und Aliase.
 * @param vertical - Der Vertical-String aus der DB
 * @returns Das gemappte LeadVertical
 */
export function mapToLeadVertical(vertical?: string | null): LeadVertical {
  if (!vertical) return 'generic';
  
  const normalized = vertical.toLowerCase().trim();
  
  // Network Marketing Varianten
  if (
    normalized === 'network' ||
    normalized === 'network_marketing' ||
    normalized === 'networkmarketing' ||
    normalized === 'mlm'
  ) {
    return 'network';
  }
  
  // Real Estate / Immobilien Varianten
  if (
    normalized === 'real_estate' ||
    normalized === 'realestate' ||
    normalized === 'immo' ||
    normalized === 'immobilien' ||
    normalized === 'makler'
  ) {
    return 'real_estate';
  }
  
  // Finance Varianten
  if (
    normalized === 'finance' ||
    normalized === 'finanz' ||
    normalized === 'financial' ||
    normalized === 'finanzberatung' ||
    normalized === 'versicherung' ||
    normalized === 'insurance'
  ) {
    return 'finance';
  }
  
  return 'generic';
}

/**
 * Baut die passende Nachricht für ein Template basierend auf dem Lead-Vertical.
 * Verwendet perVerticalMessages falls vorhanden, sonst defaultMessage.
 * 
 * @param template - Das Follow-up Template
 * @param vertical - Der Vertical-String des Leads (optional)
 * @returns Das verwendete Vertical und die passende Nachricht
 */
export function buildMessageForVertical(
  template: FollowUpTemplate,
  vertical?: string | null
): { usedVertical: LeadVertical; message: string } {
  // Vertical mappen
  const mappedVertical = mapToLeadVertical(vertical);
  
  // Prüfen ob perVerticalMessages existiert und eine Nachricht für das Vertical hat
  const verticalMessage = template.perVerticalMessages?.[mappedVertical];
  
  if (verticalMessage) {
    return {
      usedVertical: mappedVertical,
      message: verticalMessage,
    };
  }
  
  // Fallback auf defaultMessage
  return {
    usedVertical: mappedVertical,
    message: template.defaultMessage,
  };
}

/**
 * Ersetzt {{name}} Platzhalter im Nachrichtentext.
 * @param message - Die Nachricht mit Platzhalter
 * @param name - Der Name zum Einsetzen
 * @returns Die personalisierte Nachricht
 */
export function personalizeMessage(message: string, name?: string | null): string {
  if (!name) {
    return message.replace(/\{\{name\}\}/g, '');
  }
  const firstName = name.split(' ')[0];
  return message.replace(/\{\{name\}\}/g, firstName);
}

/**
 * Gibt die Phasen-Label für das UI zurück.
 * @param phase - Die Phase
 * @returns Label und Farbe für das Badge
 */
export function getPhaseDisplay(phase: FollowUpPhase): { label: string; color: string } {
  switch (phase) {
    case 'followup':
      return { label: 'Follow-up', color: 'bg-emerald-500/20 text-emerald-400' };
    case 'reactivation':
      return { label: 'Reaktivierung', color: 'bg-amber-500/20 text-amber-400' };
    case 'loop':
      return { label: 'Loop', color: 'bg-purple-500/20 text-purple-400' };
    default:
      return { label: 'Unbekannt', color: 'bg-slate-500/20 text-slate-400' };
  }
}

