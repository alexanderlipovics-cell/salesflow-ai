/**
 * Autopilot Test Helper
 * 
 * Hilfsfunktionen zum Erstellen von Test-Message-Events
 * WICHTIG: Nur für Development/Testing verwenden!
 */

import { MessageEventCreate, MessageChannel } from '@/services/autopilotService';

export const TEST_MESSAGES: MessageEventCreate[] = [
  {
    channel: 'internal',
    direction: 'inbound',
    text: 'Hey, interessiert mich! Was kostet das Produkt?',
  },
  {
    channel: 'internal',
    direction: 'inbound',
    text: 'Das ist mir zu teuer. Gibt es einen Rabatt?',
  },
  {
    channel: 'internal',
    direction: 'inbound',
    text: 'Können wir einen Termin für nächste Woche machen?',
  },
  {
    channel: 'internal',
    direction: 'inbound',
    text: 'Ich habe keine Zeit gerade, melde mich später.',
  },
  {
    channel: 'internal',
    direction: 'inbound',
    text: 'Danke für die Info! Klingt spannend, schick mir mehr Details.',
  },
];

/**
 * Hinweis: Um Test-Messages zu erstellen, kannst du im Browser Console folgendes ausführen:
 * 
 * 1. Importiere den Hook in der AutopilotPage
 * 2. Füge einen "Test-Events erstellen" Button hinzu
 * 3. Oder nutze die Browser Console:
 * 
 * // Im Chat der App eine inbound Message erstellen:
 * // Gehe zur /autopilot Seite und nutze die Browser Dev Tools
 */

