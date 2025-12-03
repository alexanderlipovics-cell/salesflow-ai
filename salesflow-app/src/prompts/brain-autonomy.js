/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - BRAIN AUTONOMY PROMPTS                                         ║
 * ║  Das Gehirn der KI-Autonomie                                              ║
 * ║                                                                            ║
 * ║  Decision Engine für selbstständiges Handeln basierend auf:               ║
 * ║  - Autonomie-Level (0-4)                                                  ║
 * ║  - Knowledge Base                                                          ║
 * ║  - Compliance-Regeln                                                       ║
 * ║  - User-Präferenzen                                                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// AUTONOMY LEVELS
// ═══════════════════════════════════════════════════════════════════════════

export const AUTONOMY_LEVELS = {
  0: {
    name: 'observer',
    label: 'Observer',
    emoji: '👀',
    description: 'Nur beobachten und analysieren',
    permissions: {
      analyze: true,
      suggest: true,
      draft: false,
      send: false,
      book: false,
      negotiate: false,
    },
    autoActions: [],
  },
  1: {
    name: 'assistant',
    label: 'Assistant',
    emoji: '🤖',
    description: 'Vorschläge machen, Drafts erstellen',
    permissions: {
      analyze: true,
      suggest: true,
      draft: true,
      send: false,
      book: false,
      negotiate: false,
    },
    autoActions: ['draft_response', 'suggest_next_action'],
  },
  2: {
    name: 'supervised',
    label: 'Supervised',
    emoji: '🛡️',
    description: 'Handeln mit Genehmigung',
    permissions: {
      analyze: true,
      suggest: true,
      draft: true,
      send: true, // mit Genehmigung
      book: true, // mit Genehmigung
      negotiate: false,
    },
    autoActions: ['draft_response', 'suggest_next_action', 'prepare_followup'],
  },
  3: {
    name: 'autopilot',
    label: 'Autopilot',
    emoji: '✈️',
    description: 'Selbstständig bei hoher Confidence',
    permissions: {
      analyze: true,
      suggest: true,
      draft: true,
      send: true, // bei confidence > threshold
      book: true, // bei confidence > threshold
      negotiate: false,
    },
    autoActions: ['draft_response', 'suggest_next_action', 'prepare_followup', 'send_approved', 'book_meetings'],
  },
  4: {
    name: 'full_auto',
    label: 'Full Auto',
    emoji: '🚀',
    description: 'Komplett autonom inkl. Closing',
    permissions: {
      analyze: true,
      suggest: true,
      draft: true,
      send: true,
      book: true,
      negotiate: true,
    },
    autoActions: ['all'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DECISION ENGINE SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export const BRAIN_DECISION_ENGINE_PROMPT = `
Du bist die Decision Engine von AURA OS - das Gehirn des Systems.

═══════════════════════════════════════════════════════════════
DEINE ROLLE
═══════════════════════════════════════════════════════════════

Du analysierst eingehende Nachrichten und Events und entscheidest:
1. WAS ist die Situation? (Intent Detection)
2. WAS sollte getan werden? (Action Planning)
3. WIE sicher bist du? (Confidence Score)
4. DARF ich handeln? (Permission Check basierend auf Autonomy Level)

═══════════════════════════════════════════════════════════════
INTENT CATEGORIES
═══════════════════════════════════════════════════════════════

INFORMATION_REQUEST:
- Lead fragt nach Produkt/Service-Infos
- Preisanfrage
- Verfügbarkeit
- Technische Fragen

OBJECTION:
- "Zu teuer"
- "Keine Zeit"
- "Muss überlegen"
- "Partner muss zustimmen"
- Skepsis/Zweifel

BUYING_SIGNAL:
- Interesse an Termin
- Fragt nach nächsten Schritten
- Positive Reaktion
- "Wie geht es weiter?"

GHOST_RISK:
- Keine Antwort seit X Tagen
- Kurze/ausweichende Antworten
- Abnehmende Engagement

READY_TO_CLOSE:
- Explizites Interesse
- "Ich will starten"
- Fragt nach Vertrag/Bestellung

SMALL_TALK:
- Höflichkeiten
- Allgemeine Konversation
- Keine klare Kaufabsicht

NEGATIVE:
- Ablehnung
- "Kein Interesse"
- Unsubscribe-Request

═══════════════════════════════════════════════════════════════
ACTION TYPES
═══════════════════════════════════════════════════════════════

SEND_INFO: Informative Antwort senden
HANDLE_OBJECTION: Einwand behandeln
BOOK_MEETING: Termin vorschlagen/buchen
SEND_PROPOSAL: Angebot senden
CLOSE: Abschluss machen
NURTURE: Relationship aufbauen
REACTIVATE: Ghost-Lead reaktivieren
ESCALATE: An User eskalieren
WAIT: Abwarten

═══════════════════════════════════════════════════════════════
CONFIDENCE SCORING
═══════════════════════════════════════════════════════════════

0.0 - 0.3: LOW - Immer eskalieren
0.4 - 0.6: MEDIUM - Je nach Autonomy Level
0.7 - 0.9: HIGH - Kann autonom handeln (Level 3+)
0.9 - 1.0: VERY HIGH - Sicher autonom handeln

CONFIDENCE FAKTOREN:
+ Klarer Intent (+0.2)
+ Bekannter Lead mit History (+0.15)
+ Passt zu Knowledge Base (+0.15)
+ Keine Compliance-Risiken (+0.1)
- Ambivalente Nachricht (-0.2)
- Unbekannter Lead (-0.1)
- Potenzielle Compliance-Issues (-0.3)
- Emotionaler Content (-0.1)

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

{
  "intent": "BUYING_SIGNAL|OBJECTION|...",
  "confidence": 0.XX,
  "recommended_action": "SEND_INFO|HANDLE_OBJECTION|...",
  "reasoning": "Kurze Begründung",
  "draft_response": "Vorgeschlagene Antwort wenn applicable",
  "requires_approval": true|false,
  "escalation_reason": "Nur wenn eskaliert wird",
  "compliance_check": {
    "passed": true|false,
    "warnings": ["..."]
  },
  "next_action_timing": "sofort|in_1h|morgen|...",
  "lead_temperature_change": "warmer|kälter|gleich"
}

═══════════════════════════════════════════════════════════════
COMPLIANCE REGELN (IMMER PRÜFEN)
═══════════════════════════════════════════════════════════════

❌ NIEMALS automatisch:
- Konkrete Einkommensversprechen
- Medizinische Aussagen
- Rechtliche Beratung
- Garantie-Versprechen
- Vertrauliche Infos teilen

⚠️ MIT VORSICHT:
- Preise (nur wenn in Knowledge Base)
- Konkurrenz-Vergleiche
- Persönliche Meinungen
`;

// ═══════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE INTEGRATION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export const KNOWLEDGE_BASE_PROMPT = `
Du hast Zugriff auf die firmeneigene Knowledge Base.

REGELN FÜR KNOWLEDGE BASE NUTZUNG:

1. PRIORITÄT: Immer zuerst in der Knowledge Base suchen
2. GENAUIGKEIT: Nur exakte Infos aus der KB verwenden
3. EHRLICHKEIT: Wenn nicht in KB, sag "Das muss ich nachfragen"
4. KEINE ERFINDUNGEN: Niemals Infos erfinden

KNOWLEDGE BASE STRUKTUR:
- products: Produkt-Informationen
- pricing: Preise und Pakete
- faq: Häufige Fragen
- objections: Einwand-Antworten
- compliance: Was darf/darf nicht gesagt werden
- company: Firmen-Infos
- testimonials: Erfolgsgeschichten

SUCHE SO:
1. Exakter Match auf Keywords
2. Semantische Ähnlichkeit
3. Kategorie-basierte Suche
`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bestimmt ob eine Aktion autonom ausgeführt werden darf
 * @param {number} autonomyLevel - 0-4
 * @param {string} actionType - z.B. 'send', 'book', 'negotiate'
 * @param {number} confidence - 0-1
 * @param {number} confidenceThreshold - Mindest-Confidence für Auto-Aktionen
 * @returns {{allowed: boolean, reason: string}}
 */
export function canActAutonomously(autonomyLevel, actionType, confidence, confidenceThreshold = 0.7) {
  const level = AUTONOMY_LEVELS[autonomyLevel];
  
  if (!level) {
    return { allowed: false, reason: 'Ungültiger Autonomy Level' };
  }
  
  // Permission Check
  const hasPermission = level.permissions[actionType];
  if (!hasPermission) {
    return { allowed: false, reason: `${level.label} hat keine Berechtigung für ${actionType}` };
  }
  
  // Observer Mode - nie autonom
  if (autonomyLevel === 0) {
    return { allowed: false, reason: 'Observer Mode - nur Analyse' };
  }
  
  // Assistant Mode - nur Drafts
  if (autonomyLevel === 1 && actionType !== 'draft') {
    return { allowed: false, reason: 'Assistant Mode - nur Drafts erstellen' };
  }
  
  // Supervised Mode - braucht Genehmigung
  if (autonomyLevel === 2) {
    return { allowed: false, reason: 'Supervised Mode - Genehmigung erforderlich', requiresApproval: true };
  }
  
  // Autopilot Mode - Confidence Check
  if (autonomyLevel === 3) {
    if (confidence < confidenceThreshold) {
      return { allowed: false, reason: `Confidence ${(confidence * 100).toFixed(0)}% unter Schwellwert ${(confidenceThreshold * 100).toFixed(0)}%`, requiresApproval: true };
    }
    // Negotiate nie erlaubt
    if (actionType === 'negotiate') {
      return { allowed: false, reason: 'Autopilot kann nicht verhandeln', requiresApproval: true };
    }
  }
  
  // Full Auto - alles erlaubt
  if (autonomyLevel === 4) {
    return { allowed: true, reason: 'Full Auto Mode' };
  }
  
  return { allowed: true, reason: `${level.label} mit Confidence ${(confidence * 100).toFixed(0)}%` };
}

/**
 * Baut den Kontext für die Decision Engine
 * @param {Object} options
 * @param {string} options.message - Eingehende Nachricht
 * @param {Object} [options.lead] - Lead-Daten wenn vorhanden
 * @param {Object} [options.knowledgeBase] - Relevante KB-Einträge
 * @param {number} options.autonomyLevel - 0-4
 * @param {number} options.confidenceThreshold - 0-1
 * @param {Object} [options.complianceRules] - Firmen-Compliance-Regeln
 * @returns {string}
 */
export function buildDecisionContext(options) {
  const {
    message,
    lead,
    knowledgeBase,
    autonomyLevel,
    confidenceThreshold,
    complianceRules,
  } = options;
  
  const level = AUTONOMY_LEVELS[autonomyLevel] || AUTONOMY_LEVELS[0];
  
  let context = `
═══════════════════════════════════════════════════════════════
DECISION CONTEXT
═══════════════════════════════════════════════════════════════

AUTONOMY LEVEL: ${autonomyLevel} - ${level.label} (${level.emoji})
ERLAUBTE AKTIONEN: ${Object.entries(level.permissions)
    .filter(([_, v]) => v)
    .map(([k]) => k)
    .join(', ')}
CONFIDENCE THRESHOLD: ${(confidenceThreshold * 100).toFixed(0)}%

EINGEHENDE NACHRICHT:
"${message}"
`;

  if (lead) {
    context += `
LEAD KONTEXT:
- Name: ${lead.name || 'Unbekannt'}
- Status: ${lead.status || 'new'}
- Letzter Kontakt: ${lead.lastContact || 'Nie'}
- DISG-Typ: ${lead.discProfile?.dominant_style || 'Unbekannt'}
- Score: ${lead.score || 'N/A'}
${lead.notes ? `- Notizen: ${lead.notes}` : ''}
`;
  }

  if (knowledgeBase && Object.keys(knowledgeBase).length > 0) {
    context += `
RELEVANTE KNOWLEDGE BASE EINTRÄGE:
${JSON.stringify(knowledgeBase, null, 2)}
`;
  }

  if (complianceRules) {
    context += `
COMPLIANCE REGELN:
- Verbotene Wörter: ${complianceRules.forbiddenWords?.join(', ') || 'Keine'}
- Erforderliche Disclaimer: ${Object.keys(complianceRules.requiredDisclaimers || {}).join(', ') || 'Keine'}
`;
  }

  context += `
Analysiere die Nachricht und gib deine Entscheidung als JSON zurück.
`;

  return context;
}

/**
 * Analysiert die Decision Engine Response
 * @param {Object} response - Die geparste JSON Response
 * @param {number} autonomyLevel - 0-4
 * @param {number} confidenceThreshold - 0-1
 * @returns {Object} - Aufbereitete Entscheidung
 */
export function processDecision(response, autonomyLevel, confidenceThreshold = 0.7) {
  const actionType = response.recommended_action?.toLowerCase().includes('send') ? 'send' :
                     response.recommended_action?.toLowerCase().includes('book') ? 'book' :
                     response.recommended_action?.toLowerCase().includes('close') ? 'negotiate' : 'suggest';
  
  const canAct = canActAutonomously(
    autonomyLevel,
    actionType,
    response.confidence,
    confidenceThreshold
  );
  
  return {
    ...response,
    canActAutonomously: canAct.allowed,
    autonomyReason: canAct.reason,
    requiresApproval: canAct.requiresApproval || false,
    autonomyLevel,
    actionType,
    // Status für UI
    status: canAct.allowed ? 'auto' : canAct.requiresApproval ? 'pending' : 'blocked',
    statusEmoji: canAct.allowed ? '✅' : canAct.requiresApproval ? '⏳' : '🚫',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  AUTONOMY_LEVELS,
  BRAIN_DECISION_ENGINE_PROMPT,
  KNOWLEDGE_BASE_PROMPT,
  canActAutonomously,
  buildDecisionContext,
  processDecision,
};

