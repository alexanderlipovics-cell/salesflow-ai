/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - CHIEF AI DAILY FLOW CONTEXT HOOK                         ║
 * ║  Bereitet Daily Flow Status für CHIEF AI Integration auf                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useMemo } from 'react';
import { useDailyFlowStatus } from './useDailyFlowStatus';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK: useChiefDailyFlowContext
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bereitet Daily Flow Status für CHIEF AI Context auf
 * CHIEF kann diese Daten nutzen um personalisierte Tipps zu geben
 * 
 * @param {string} [companyId='default'] - Company ID
 * @returns {Object|null} CHIEF Context mit contextString und suggestedActions
 * 
 * @example
 * const chiefContext = useChiefDailyFlowContext('my-company');
 * if (chiefContext) {
 *   console.log(chiefContext.contextString);
 *   console.log(chiefContext.suggestedActions);
 * }
 */
export function useChiefDailyFlowContext(companyId = 'default') {
  const { status, summaryMessage, tipMessage } = useDailyFlowStatus(companyId);

  return useMemo(() => {
    if (!status) return null;

    const { daily, weekly, status_level, date, avg_ratio } = status;

    // Berechne fehlende Aktivitäten
    const missingContacts = Math.max(0, (daily.new_contacts?.target || 0) - (daily.new_contacts?.done || 0));
    const missingFollowups = Math.max(0, (daily.followups?.target || 0) - (daily.followups?.done || 0));
    const missingReactivations = Math.max(0, (daily.reactivations?.target || 0) - (daily.reactivations?.done || 0));

    // Context String für CHIEF
    const contextString = `
DAILY FLOW STATUS (${date}):
- Status: ${status_level.toUpperCase()}
- Durchschnittliche Zielerreichung: ${Math.round((avg_ratio || 0) * 100)}%
- Tagesziel Fortschritt:
  • Neue Kontakte: ${Math.round(daily.new_contacts?.done || 0)}/${Math.round(daily.new_contacts?.target || 0)} (${Math.round((daily.new_contacts?.ratio || 0) * 100)}%)
  • Follow-ups: ${Math.round(daily.followups?.done || 0)}/${Math.round(daily.followups?.target || 0)} (${Math.round((daily.followups?.ratio || 0) * 100)}%)
  • Reaktivierungen: ${Math.round(daily.reactivations?.done || 0)}/${Math.round(daily.reactivations?.target || 0)} (${Math.round((daily.reactivations?.ratio || 0) * 100)}%)
- Wochenfortschritt:
  • Neue Kontakte: ${Math.round(weekly.new_contacts?.done || 0)}/${Math.round(weekly.new_contacts?.target || 0)}
  • Follow-ups: ${Math.round(weekly.followups?.done || 0)}/${Math.round(weekly.followups?.target || 0)}
  • Reaktivierungen: ${Math.round(weekly.reactivations?.done || 0)}/${Math.round(weekly.reactivations?.target || 0)}
- Noch nötig heute: ${Math.round(missingContacts)} Kontakte, ${Math.round(missingFollowups)} Follow-ups, ${Math.round(missingReactivations)} Reaktivierungen
`.trim();

    // Suggested Actions für CHIEF
    const suggestedActions = [];

    if (missingContacts > 0) {
      suggestedActions.push(
        `Schlage ${Math.min(5, Math.round(missingContacts))} potenzielle neue Kontakte vor, die der User heute ansprechen könnte.`
      );
    }

    if (missingFollowups > 0) {
      suggestedActions.push(
        `Zeige die ${Math.min(5, Math.round(missingFollowups))} wichtigsten offenen Follow-ups aus dem CRM.`
      );
    }

    if (missingReactivations > 0) {
      suggestedActions.push(
        `Identifiziere ${Math.min(3, Math.round(missingReactivations))} inaktive Kontakte, die reaktiviert werden könnten.`
      );
    }

    if (status_level === 'ahead') {
      suggestedActions.push(
        `Der User ist voraus - gratuliere und schlage vor, die Zeit für strategische Planung zu nutzen.`
      );
    }

    if (status_level === 'behind') {
      suggestedActions.push(
        `Der User ist deutlich hinter dem Ziel. Biete konkrete Hilfe an, um wieder auf Kurs zu kommen.`
      );
    }

    return {
      contextString,
      suggestedActions,
      statusLevel: status_level,
      avgRatio: avg_ratio,
      summaryMessage,
      tipMessage,
    };
  }, [status, summaryMessage, tipMessage]);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Format for System Prompt
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formatiert Daily Flow Context als System Prompt Abschnitt für CHIEF
 * 
 * @param {Object} context - Context von useChiefDailyFlowContext
 * @returns {string} Formatierter Prompt-Abschnitt
 * 
 * @example
 * const chiefContext = useChiefDailyFlowContext('my-company');
 * const promptSection = formatDailyFlowForChiefPrompt(chiefContext);
 * systemPrompt += promptSection;
 */
export function formatDailyFlowForChiefPrompt(context) {
  if (!context) {
    return '';
  }

  return `
<daily_flow_context>
${context.contextString}

AKTUELLE ZUSAMMENFASSUNG:
${context.summaryMessage}

${context.tipMessage ? `TIPP: ${context.tipMessage}` : ''}

MÖGLICHE AKTIONEN FÜR DEN USER:
${context.suggestedActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

HINWEIS FÜR CHIEF:
- Nutze diese Daten um personalisierte, motivierende Tipps zu geben
- Beziehe dich konkret auf die Zahlen wenn passend
- Bei "behind" Status: Sei ermutigend, nicht kritisierend
- Bei "ahead" Status: Gratuliere und schlage nächste Schritte vor
- Schlage konkrete nächste Aktionen vor basierend auf den fehlenden Aktivitäten
</daily_flow_context>
`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get Quick Suggestions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gibt schnelle Vorschläge basierend auf dem Status zurück
 * 
 * @param {Object} context - Context von useChiefDailyFlowContext
 * @returns {Array<Object>} Array von Vorschlägen mit type und message
 */
export function getQuickSuggestions(context) {
  if (!context) return [];

  const suggestions = [];
  const { statusLevel, suggestedActions } = context;

  // Priorität basierend auf Status
  if (statusLevel === 'behind') {
    suggestions.push({
      type: 'urgent',
      icon: '🚨',
      message: 'Zeit für einen Fokusblock! Starte mit dem wichtigsten Kontakt.',
    });
  } else if (statusLevel === 'slightly_behind') {
    suggestions.push({
      type: 'reminder',
      icon: '⏰',
      message: 'Noch ein paar Aktivitäten und du bist auf Kurs!',
    });
  } else if (statusLevel === 'on_track') {
    suggestions.push({
      type: 'positive',
      icon: '✅',
      message: 'Super! Halte das Momentum.',
    });
  } else if (statusLevel === 'ahead') {
    suggestions.push({
      type: 'celebration',
      icon: '🎉',
      message: 'Du bist voraus! Zeit für die Extra-Meile oder eine wohlverdiente Pause.',
    });
  }

  // CHIEF-Aktionen als Vorschläge
  suggestedActions.slice(0, 2).forEach((action, index) => {
    suggestions.push({
      type: 'action',
      icon: ['💡', '🎯', '📋'][index] || '💡',
      message: action,
    });
  });

  return suggestions;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default useChiefDailyFlowContext;

