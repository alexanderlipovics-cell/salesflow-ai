/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - FOLLOW-UP GENERATOR PROMPT                                ║
 * ║  DISG-basierte personalisierte Nachrichten                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * System Prompt für Follow-up Generator
 */
export const FOLLOWUP_GENERATOR_SYSTEM_PROMPT = `
Du bist ein hochspezialisierter KI-Sales-Coach für Follow-ups im Network Marketing / Direktvertrieb.

DEINE ZIELE:
1. Hilf dem Nutzer, mehr Abschlüsse zu machen
2. Baue Follow-up-Nachrichten, die zur Persönlichkeit (DISG) des Leads passen
3. Halte dich an Compliance-Vorgaben

DISG-ANPASSUNG:

D (Dominant) → 🎯
→ Kurze Nachricht (2-3 Zeilen max)
→ Klare Empfehlung/Frage
→ Keine Emojis oder max 1
→ Direkt zum Punkt, Respekt vor der Zeit
→ Keine Smalltalk-Floskeln
Beispiel-Ton: "Hey, kurze Frage: Wollen wir das diese Woche noch fix machen?"

I (Initiativ) → 🌟
→ Wärmere Sprache, positive Stimmung
→ 1-2 Emojis sind okay
→ Beziehung betonen, Story-Aspekt
→ Enthusiasmus zeigen, aber nicht übertreiben
Beispiel-Ton: "Hey! Ich musste gerade an dich denken 😊 Wie läuft's bei dir?"

S (Stetig) → 🤝
→ Beruhigende, geduldige Sprache
→ Vertrauen & Sicherheit betonen
→ Kein Druck, viel Verständnis
→ "Kein Stress"-Formulierungen
Beispiel-Ton: "Hey, ich wollte mich kurz melden. Kein Stress - ich bin da wenn du Fragen hast."

G (Gewissenhaft) → 📊
→ Sachlich, strukturiert
→ Mit Fakten/Beispielen wenn möglich
→ Kein emotionaler Druck
→ Logische Argumentation
Beispiel-Ton: "Hi, ich habe noch ein paar Infos zu den Ergebnissen zusammengestellt..."

DECISION-STATE HANDLING:

"no_decision": 
→ Sanft herausfinden wo die Person steht
→ Offene Frage stellen
→ Keine Annahmen

"thinking": 
→ Kein Druck
→ Nächste Stufe anbieten (Q&A, Beispiel, Referenz)
→ Verständnis zeigen

"committed": 
→ Erinnerung an Zusage
→ Nächste Schritte klären
→ Termin fixieren

"not_now": 
→ Verständnis zeigen
→ Zeitfenster respektieren
→ Später Check-in anbieten
→ KEIN Sales-Druck

"rejected": 
→ Respektieren
→ Höflich offen lassen
→ KEIN Sales-Pitch
→ Nur wenn explizit angefragt

STIL-REGELN:
- WhatsApp-Länge: 2-6 Zeilen ideal (nie mehr als 8)
- Immer mit einer klaren, einfachen Frage enden (außer bei "rejected")
- Du duzt den Lead
- KEINE Einkommensversprechen ("verdiene X€")
- KEINE manipulativen Formulierungen ("letzte Chance", "nur heute")
- KEINE CAPS oder übertriebene Ausrufezeichen (!!!)
- KEINE generischen Phrasen ("ich hoffe es geht dir gut")

NACHRICHTENSTRUKTUR:
1. Kurze Anknüpfung (optional, 1 Zeile)
2. Kern-Aussage (1-2 Zeilen)
3. Klare Frage/CTA (1 Zeile)

OUTPUT FORMAT (NUR JSON):
{
  "message_text": "Die konkrete WhatsApp-Nachricht",
  "subject_line": "Optional, nur für Email relevant",
  "suggested_next_contact_at": "ISO-8601 Datum für nächsten Kontakt",
  "tone_hint": "z.B. 'ruhig, empathisch' oder 'direkt, kurz'",
  "explanation_short": "1-2 Sätze warum diese Nachricht so formuliert ist"
}

WICHTIG:
- Gib NUR das JSON zurück, KEINEN anderen Text
- message_text muss direkt kopierbar sein
- Zeitpunkt für nächsten Kontakt logisch wählen
`;

// ═══════════════════════════════════════════════════════════════════════════
// USER PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt den User-Prompt für Follow-up Generation
 * @param {Object} input
 * @param {'de'|'en'} input.language
 * @param {string} input.companyName
 * @param {string} input.productName
 * @param {string} input.productBenefit
 * @param {string} [input.complianceNotes]
 * @param {string} input.leadName
 * @param {string} input.leadStatus
 * @param {string} input.decisionState
 * @param {string} input.lastContactAt
 * @param {string} input.lastChannel
 * @param {Object} [input.discProfile]
 * @param {string} input.discProfile.dominant_style
 * @param {number} input.discProfile.disc_d
 * @param {number} input.discProfile.disc_i
 * @param {number} input.discProfile.disc_s
 * @param {number} input.discProfile.disc_g
 * @param {number} input.discProfile.confidence
 * @param {string} input.lastConversationSummary
 * @param {string} [input.lastLeadMessage]
 * @param {string} [input.userNotes]
 * @param {[number, number]} [input.desiredNextDays]
 * @returns {string}
 */
export function buildFollowUpPrompt(input) {
  const {
    language = 'de',
    companyName,
    productName,
    productBenefit,
    complianceNotes,
    leadName,
    leadStatus,
    decisionState,
    lastContactAt,
    lastChannel,
    discProfile,
    lastConversationSummary,
    lastLeadMessage,
    userNotes,
    desiredNextDays
  } = input;

  // DISG-Info formatieren
  const discInfo = discProfile 
    ? `
DISG-PROFIL:
- Dominanter Typ: ${discProfile.dominant_style} (${getDiscTypeName(discProfile.dominant_style)})
- D: ${(discProfile.disc_d * 100).toFixed(0)}%
- I: ${(discProfile.disc_i * 100).toFixed(0)}%
- S: ${(discProfile.disc_s * 100).toFixed(0)}%
- G: ${(discProfile.disc_g * 100).toFixed(0)}%
- Confidence: ${(discProfile.confidence * 100).toFixed(0)}%
→ Passe die Nachricht an den ${discProfile.dominant_style}-Typ an!
`
    : 'DISG-PROFIL: Unbekannt (nutze neutrale, freundliche Ansprache)';

  // Tage seit letztem Kontakt
  const daysSinceContact = lastContactAt 
    ? Math.floor((Date.now() - new Date(lastContactAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return `
SPRACHE: ${language === 'de' ? 'Deutsch' : 'English'}
KANAL: ${lastChannel || 'whatsapp'}

FIRMA & PRODUKT:
- Firma: ${companyName}
- Produkt: ${productName}
- Kernnutzen: ${productBenefit}
${complianceNotes ? `- Compliance-Hinweise: ${complianceNotes}` : ''}

LEAD-INFO:
- Name: ${leadName}
- Status: ${leadStatus}
- Entscheidungs-Status: ${decisionState}
- Letzter Kontakt: ${lastContactAt || 'Unbekannt'}${daysSinceContact !== null ? ` (vor ${daysSinceContact} Tagen)` : ''}
- Letzter Kanal: ${lastChannel || 'Unbekannt'}

${discInfo}

LETZTES GESPRÄCH:
${lastConversationSummary || 'Keine Zusammenfassung verfügbar.'}

${lastLeadMessage ? `LETZTE NACHRICHT VON ${leadName.toUpperCase()}:\n"${lastLeadMessage}"` : ''}

${userNotes ? `EIGENE NOTIZEN:\n${userNotes}` : ''}

ZEITFENSTER für nächsten Kontakt: ${desiredNextDays ? `${desiredNextDays[0]}-${desiredNextDays[1]} Tage` : 'AI wählt passend zum Status'}

Erstelle jetzt die perfekte Follow-up Nachricht als JSON.
`;
}

/**
 * Hilfsfunktion: DISG-Typ Name
 */
function getDiscTypeName(style) {
  const names = {
    D: 'Dominant',
    I: 'Initiativ',
    S: 'Stetig',
    G: 'Gewissenhaft'
  };
  return names[style] || 'Unbekannt';
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK TEMPLATES (ohne AI)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schnelle Template-basierte Follow-ups
 * Kann verwendet werden wenn keine AI verfügbar
 * 
 * @param {Object} options
 * @param {string} options.leadName
 * @param {'D'|'I'|'S'|'G'} options.discStyle
 * @param {string} options.decisionState
 * @param {number} options.daysSinceContact
 * @returns {{message_text: string, tone_hint: string, suggested_days: number}}
 */
export function getQuickFollowUpTemplate(options) {
  const { leadName, discStyle = 'S', decisionState, daysSinceContact = 3 } = options;
  
  // Templates nach DISG und Decision State
  const templates = {
    D: {
      no_decision: {
        message: `Hey ${leadName}, kurze Frage: Macht das Thema für dich Sinn, oder soll ich nicht weiter nerven?`,
        tone: 'direkt, kurz',
        days: 2
      },
      thinking: {
        message: `Hey ${leadName}, nur kurz: Brauchst du noch Infos für deine Entscheidung, oder passt alles?`,
        tone: 'direkt, respektvoll',
        days: 3
      },
      committed: {
        message: `Hey ${leadName}, wann starten wir? Ich kann dir morgen oder übermorgen 15 Min geben.`,
        tone: 'direkt, action-orientiert',
        days: 1
      },
      not_now: {
        message: `Hey ${leadName}, alles klar. Wann soll ich mich wieder melden?`,
        tone: 'kurz, respektiert Timing',
        days: 14
      }
    },
    I: {
      no_decision: {
        message: `Hey ${leadName}! 👋 Wie geht's dir? Ich wollte mal hören, was du zu dem Thema denkst. Lass uns quatschen wenn du Lust hast!`,
        tone: 'warm, enthusiastisch',
        days: 2
      },
      thinking: {
        message: `Hey ${leadName}! 😊 Ich hab an dich gedacht - hast du noch Fragen? Kann dir gern noch ein paar coole Beispiele zeigen!`,
        tone: 'enthusiastisch, einladend',
        days: 3
      },
      committed: {
        message: `Hey ${leadName}! 🎉 Mega, dass du dabei bist! Wann sollen wir loslegen? Freu mich drauf!`,
        tone: 'enthusiastisch, motivierend',
        days: 1
      },
      not_now: {
        message: `Hey ${leadName}! Kein Ding, jeder hat sein Tempo 😊 Meld dich einfach wenn's passt - ich bin da!`,
        tone: 'verständnisvoll, positiv',
        days: 21
      }
    },
    S: {
      no_decision: {
        message: `Hey ${leadName}, ich wollte mich kurz melden. Kein Stress - nimm dir die Zeit die du brauchst. Hast du noch Fragen?`,
        tone: 'ruhig, geduldig',
        days: 4
      },
      thinking: {
        message: `Hey ${leadName}, ich verstehe dass du noch nachdenkst. Das ist völlig okay. Falls du noch etwas brauchst, bin ich da.`,
        tone: 'verständnisvoll, unterstützend',
        days: 5
      },
      committed: {
        message: `Hey ${leadName}, schön dass du dich entschieden hast. Ich begleite dich Schritt für Schritt. Wann passt es dir für den nächsten Schritt?`,
        tone: 'unterstützend, sicher',
        days: 2
      },
      not_now: {
        message: `Hey ${leadName}, völlig in Ordnung. Ich melde mich in ein paar Wochen nochmal - ganz ohne Druck.`,
        tone: 'verständnisvoll, kein Druck',
        days: 28
      }
    },
    G: {
      no_decision: {
        message: `Hey ${leadName}, ich wollte nachfragen ob du noch weitere Informationen benötigst. Kann dir gern Details zu [X] schicken.`,
        tone: 'sachlich, informativ',
        days: 3
      },
      thinking: {
        message: `Hey ${leadName}, ich hab noch ein paar Fakten zusammengestellt die dir bei der Entscheidung helfen könnten. Soll ich sie dir schicken?`,
        tone: 'sachlich, hilfreich',
        days: 4
      },
      committed: {
        message: `Hey ${leadName}, ich hab die nächsten Schritte vorbereitet: 1) [X] 2) [Y]. Wann passt es dir, die Details durchzugehen?`,
        tone: 'strukturiert, klar',
        days: 2
      },
      not_now: {
        message: `Hey ${leadName}, verstehe ich. Falls du später nochmal Infos brauchst, hab ich alles dokumentiert. Melde mich in 4 Wochen.`,
        tone: 'sachlich, respektvoll',
        days: 28
      }
    }
  };

  const styleTemplates = templates[discStyle] || templates.S;
  const template = styleTemplates[decisionState] || styleTemplates.no_decision;

  return {
    message_text: template.message,
    tone_hint: template.tone,
    suggested_days: template.days
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHANNEL-SPECIFIC ADJUSTMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Passt Nachricht an Kanal an
 * @param {string} message
 * @param {'whatsapp'|'phone'|'email'|'social'|'meeting'} channel
 * @returns {{message: string, subject?: string}}
 */
export function adjustMessageForChannel(message, channel) {
  switch (channel) {
    case 'email':
      return {
        message: message,
        subject: extractSubjectFromMessage(message)
      };
    
    case 'phone':
      // Für Telefon: Gesprächsleitfaden statt Nachricht
      return {
        message: `📞 Gesprächspunkte:\n${message}\n\n→ Nach Call: Nächsten Schritt klären`
      };
    
    case 'social':
      // Kürzer für Social Media
      return {
        message: message.length > 300 ? message.substring(0, 297) + '...' : message
      };
    
    case 'meeting':
      return {
        message: `📅 Meeting-Agenda:\n${message}`
      };
    
    case 'whatsapp':
    default:
      return { message };
  }
}

function extractSubjectFromMessage(message) {
  // Erste Zeile als Subject
  const firstLine = message.split('\n')[0];
  return firstLine.substring(0, 60).replace(/[!?.,]+$/, '');
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMING SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schlägt optimalen Zeitpunkt für nächsten Kontakt vor
 * @param {string} decisionState
 * @param {'D'|'I'|'S'|'G'} discStyle
 * @param {number} [daysSinceLastContact]
 * @returns {{days: number, reasoning: string}}
 */
export function suggestNextContactTiming(decisionState, discStyle = 'S', daysSinceLastContact = 0) {
  const baseTimings = {
    no_decision: { D: 2, I: 2, S: 4, G: 3 },
    thinking: { D: 3, I: 3, S: 5, G: 4 },
    committed: { D: 1, I: 1, S: 2, G: 2 },
    not_now: { D: 14, I: 21, S: 28, G: 28 },
    rejected: { D: 90, I: 60, S: 90, G: 90 }
  };

  const timings = baseTimings[decisionState] || baseTimings.no_decision;
  const baseDays = timings[discStyle] || timings.S;

  // Adjustiere basierend auf letztem Kontakt
  let days = baseDays;
  if (daysSinceLastContact > 14 && decisionState !== 'rejected') {
    days = Math.max(1, baseDays - 1); // Schneller nachfassen wenn länger her
  }

  const reasonings = {
    no_decision: `Status noch unklar - ${discStyle === 'D' ? 'D-Typen mögen schnelle Klärung' : 'genug Zeit lassen'}`,
    thinking: `Lead denkt nach - ${discStyle === 'S' ? 'S-Typen brauchen mehr Zeit' : 'sanft nachfassen'}`,
    committed: `Zugesagt - schnell nächste Schritte klären`,
    not_now: `Respektiert das Timing - in ${days} Tagen erneut versuchen`,
    rejected: `Abgesagt - sehr langer Abstand, nur bei explizitem Interesse`
  };

  return {
    days,
    reasoning: reasonings[decisionState] || 'Standard-Timing'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  FOLLOWUP_GENERATOR_SYSTEM_PROMPT,
  buildFollowUpPrompt,
  getQuickFollowUpTemplate,
  adjustMessageForChannel,
  suggestNextContactTiming
};

