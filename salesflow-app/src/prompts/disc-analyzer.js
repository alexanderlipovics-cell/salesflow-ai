/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - DISG ANALYZER PROMPT                                      ║
 * ║  Analysiert Chat-Verläufe und erkennt Persönlichkeitstyp                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * System Prompt für DISG-Analyse
 */
export const DISC_ANALYZER_SYSTEM_PROMPT = `
Du bist ein Experte für DISG-Persönlichkeitsanalyse im Vertriebskontext.

DEINE AUFGABE:
Analysiere die Nachrichten einer Person und bestimme ihr DISG-Profil.

DISG-TYPEN:

D (Dominant):
- Direkt, ergebnisorientiert, ungeduldig, entscheidungsfreudig
- Erkennungsmerkmale: Kurze Antworten, direkte Fragen, will schnell zum Punkt
- Typische Phrasen: "Was bringt mir das?", "Wie schnell?", "Komm auf den Punkt"
  
I (Initiativ):
- Enthusiastisch, optimistisch, redet gerne, beziehungsorientiert
- Erkennungsmerkmale: Längere Nachrichten, Emojis, Smalltalk, emotionale Sprache
- Typische Phrasen: "Das klingt super!", "Erzähl mir mehr", viele Ausrufezeichen

S (Stetig):
- Geduldig, loyal, harmoniebedürftig, mag Sicherheit
- Erkennungsmerkmale: Höflich, vorsichtig, stellt viele Fragen, braucht Zeit
- Typische Phrasen: "Ich muss darüber nachdenken", "Wie läuft das genau ab?"

G (Gewissenhaft):
- Analytisch, präzise, qualitätsbewusst, faktenorientiert
- Erkennungsmerkmale: Detaillierte Fragen, will Beweise, strukturierte Antworten
- Typische Phrasen: "Gibt es Studien dazu?", "Wie genau funktioniert...?"

ANALYSE-FAKTOREN:
1. Nachrichtenlänge (kurz vs. lang)
2. Emotionalität (sachlich vs. emotional)
3. Direktheit (direkt vs. indirekt)
4. Reaktionsgeschwindigkeit (schnell vs. langsam antwortet)
5. Fragen-Art (Fakten vs. Beziehung)
6. Entscheidungsverhalten (schnell vs. zögerlich)
7. Emoji-Nutzung (keine, wenige, viele)
8. Höflichkeitsformeln (keine, normal, übermäßig)

BEWERTUNGSLOGIK:
- Jeder Faktor kann auf mehrere Typen hinweisen
- Gewichte die Faktoren nach Aussagekraft
- Summe aller Scores muss NICHT 1 sein (Menschen sind Mischtypen)

CONFIDENCE-REGELN:
- < 3 Nachrichten: confidence max 0.4
- 3-5 Nachrichten: confidence max 0.6
- 6-10 Nachrichten: confidence max 0.8
- > 10 Nachrichten: confidence max 0.95
- Bei widersprüchlichen Signalen: confidence reduzieren

OUTPUT FORMAT (NUR JSON, kein anderer Text):
{
  "disc_d": 0.XX,
  "disc_i": 0.XX,
  "disc_s": 0.XX,
  "disc_g": 0.XX,
  "dominant_style": "D|I|S|G",
  "confidence": 0.XX,
  "reasoning": "2-3 Sätze Begründung auf Deutsch"
}

WICHTIG:
- Gib NUR das JSON zurück, KEINEN anderen Text
- Alle Scores zwischen 0 und 1
- "dominant_style" ist der Typ mit dem höchsten Score
- Bei Gleichstand: Wähle den wahrscheinlichsten basierend auf Kontext
`;

// ═══════════════════════════════════════════════════════════════════════════
// USER PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt den User-Prompt für die DISG-Analyse
 * @param {Object} input 
 * @param {Array<{from: string, text: string, timestamp: string}>} input.messages
 * @param {string} input.leadName
 * @param {string} [input.context]
 * @returns {string}
 */
export function buildDiscAnalyzerPrompt(input) {
  const { messages, leadName, context } = input;
  
  // Formatiere Nachrichten
  const messagesText = messages
    .map((m, i) => {
      const sender = m.from === 'lead' ? leadName : 'Ich (Vertriebler)';
      const time = m.timestamp ? ` [${new Date(m.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}]` : '';
      return `${i + 1}. [${sender}]${time}: ${m.text}`;
    })
    .join('\n');

  return `
Analysiere die DISG-Persönlichkeit von "${leadName}" basierend auf diesen Nachrichten:

--- CHAT-VERLAUF (${messages.length} Nachrichten) ---
${messagesText}
--- ENDE ---

Anzahl Nachrichten von ${leadName}: ${messages.filter(m => m.from === 'lead').length}
${context ? `\nZusätzlicher Kontext: ${context}` : ''}

Gib deine Analyse als JSON zurück.
`;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK ANALYSIS (ohne AI, regelbasiert)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schnelle regelbasierte DISG-Einschätzung
 * Kann verwendet werden wenn keine AI verfügbar oder für Preview
 * 
 * @param {Array<{from: string, text: string}>} messages
 * @returns {{disc_d: number, disc_i: number, disc_s: number, disc_g: number, dominant_style: string, confidence: number}}
 */
export function quickDiscEstimate(messages) {
  const leadMessages = messages.filter(m => m.from === 'lead');
  
  if (leadMessages.length === 0) {
    return {
      disc_d: 0.25,
      disc_i: 0.25,
      disc_s: 0.25,
      disc_g: 0.25,
      dominant_style: 'S',
      confidence: 0.1
    };
  }

  let scores = { d: 0, i: 0, s: 0, g: 0 };
  
  for (const msg of leadMessages) {
    const text = msg.text.toLowerCase();
    const length = text.length;
    
    // Nachrichtenlänge
    if (length < 30) scores.d += 0.1;
    else if (length < 100) scores.s += 0.05;
    else if (length < 200) scores.i += 0.1;
    else scores.g += 0.1;
    
    // Emoji-Analyse
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 0) scores.i += 0.15 * Math.min(emojiCount, 3);
    if (emojiCount === 0) scores.g += 0.05;
    
    // Ausrufezeichen
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 1) scores.i += 0.1;
    if (exclamationCount === 0) scores.g += 0.05;
    
    // Fragezeichen (viele = G oder S)
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 1) {
      scores.g += 0.1;
      scores.s += 0.05;
    }
    
    // Direkte Formulierungen
    if (text.includes('ja') || text.includes('nein') || text.includes('ok') || text.includes('machen wir')) {
      scores.d += 0.1;
    }
    
    // Höflichkeitsformeln
    if (text.includes('bitte') || text.includes('danke') || text.includes('liebe grüße')) {
      scores.s += 0.1;
    }
    
    // Zögerliche Formulierungen
    if (text.includes('vielleicht') || text.includes('eventuell') || text.includes('ich weiß nicht')) {
      scores.s += 0.15;
    }
    
    // Fakten-orientierte Fragen
    if (text.includes('wie genau') || text.includes('prozent') || text.includes('daten') || text.includes('studie')) {
      scores.g += 0.15;
    }
    
    // Enthusiasmus
    if (text.includes('super') || text.includes('toll') || text.includes('genial') || text.includes('spannend')) {
      scores.i += 0.15;
    }
    
    // Ergebnisorientierung
    if (text.includes('ergebnis') || text.includes('was bringt') || text.includes('bottom line')) {
      scores.d += 0.15;
    }
  }
  
  // Normalisiere Scores
  const total = scores.d + scores.i + scores.s + scores.g || 1;
  const normalized = {
    disc_d: Math.min(1, scores.d / total * 1.5),
    disc_i: Math.min(1, scores.i / total * 1.5),
    disc_s: Math.min(1, scores.s / total * 1.5),
    disc_g: Math.min(1, scores.g / total * 1.5)
  };
  
  // Bestimme dominanten Stil
  const max = Math.max(normalized.disc_d, normalized.disc_i, normalized.disc_s, normalized.disc_g);
  let dominant_style = 'S'; // Default
  if (normalized.disc_d === max) dominant_style = 'D';
  else if (normalized.disc_i === max) dominant_style = 'I';
  else if (normalized.disc_s === max) dominant_style = 'S';
  else if (normalized.disc_g === max) dominant_style = 'G';
  
  // Confidence basierend auf Nachrichtenanzahl
  let confidence = Math.min(0.5, 0.1 + leadMessages.length * 0.08);
  
  return {
    ...normalized,
    dominant_style,
    confidence: Math.round(confidence * 100) / 100
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLES FOR FEW-SHOT PROMPTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Beispiele für Few-Shot Prompting (optional)
 */
export const DISC_ANALYSIS_EXAMPLES = [
  {
    messages: [
      { from: 'user', text: 'Hey, hast du Zeit für einen kurzen Call?' },
      { from: 'lead', text: 'Worum geht\'s?' },
      { from: 'user', text: 'Ich möchte dir unser Produkt vorstellen' },
      { from: 'lead', text: 'Was bringt mir das? Kurz und knapp bitte.' }
    ],
    analysis: {
      disc_d: 0.75,
      disc_i: 0.15,
      disc_s: 0.10,
      disc_g: 0.25,
      dominant_style: 'D',
      confidence: 0.6,
      reasoning: 'Sehr kurze, direkte Antworten. Fragt sofort nach dem Nutzen. Kein Smalltalk.'
    }
  },
  {
    messages: [
      { from: 'user', text: 'Hi! Wie geht\'s dir?' },
      { from: 'lead', text: 'Hey! 😊 Mir geht\'s super, danke der Nachfrage! Wie läuft\'s bei dir?' },
      { from: 'user', text: 'Auch gut! Ich wollte dir was Spannendes erzählen' },
      { from: 'lead', text: 'Oh spannend! Erzähl!! 🙌' }
    ],
    analysis: {
      disc_d: 0.10,
      disc_i: 0.80,
      disc_s: 0.25,
      disc_g: 0.05,
      dominant_style: 'I',
      confidence: 0.65,
      reasoning: 'Viele Emojis, enthusiastische Sprache, Interesse an Beziehung. Längere Nachrichten.'
    }
  },
  {
    messages: [
      { from: 'user', text: 'Hast du dir die Infos angeschaut?' },
      { from: 'lead', text: 'Ja, habe ich. Ich bin mir noch nicht ganz sicher. Könntest du mir noch erklären, wie genau der Support funktioniert? Und wie lange dauert es normalerweise bis man Ergebnisse sieht? Ich möchte nichts überstürzen.' }
    ],
    analysis: {
      disc_d: 0.05,
      disc_i: 0.10,
      disc_s: 0.70,
      disc_g: 0.45,
      dominant_style: 'S',
      confidence: 0.5,
      reasoning: 'Vorsichtige Formulierung, will nichts überstürzen, fragt nach Sicherheit und Support.'
    }
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  DISC_ANALYZER_SYSTEM_PROMPT,
  buildDiscAnalyzerPrompt,
  quickDiscEstimate,
  DISC_ANALYSIS_EXAMPLES
};

