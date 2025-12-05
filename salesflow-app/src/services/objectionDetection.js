import { supabase } from './supabase';

/**
 * Einwand-Keywords für automatische Erkennung
 */
const OBJECTION_KEYWORDS = {
  preis: ['zu teuer', 'teuer', 'preis', 'kosten', 'geld', 'bezahlen', 'zahlung', 'preislich', 'kostet'],
  zeit: ['keine zeit', 'kein zeit', 'zeit', 'beschäftigt', 'stressig', 'viel zu tun', 'keine kapazität'],
  interesse: ['kein interesse', 'interessiert mich nicht', 'brauche ich nicht', 'nicht interessiert', 'kein bedarf'],
  skepsis: ['muss überlegen', 'überlegen', 'schlafen', 'partner fragen', 'frau fragen', 'mann fragen', 'nachdenken', 'bedenkzeit', 'zurückmelden'],
};

/**
 * Erkennt Einwand-Keywords in einer Nachricht
 * @param {string} message - Die zu prüfende Nachricht
 * @returns {Object|null} - { type: 'preis'|'zeit'|'interesse'|'skepsis', keywords: string[] } oder null
 */
export const detectObjection = (message) => {
  if (!message || typeof message !== 'string') return null;
  
  const lowerMessage = message.toLowerCase().trim();
  
  // Prüfe jede Kategorie
  for (const [type, keywords] of Object.entries(OBJECTION_KEYWORDS)) {
    const foundKeywords = keywords.filter(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      return {
        type,
        keywords: foundKeywords,
        category: getCategoryLabel(type),
      };
    }
  }
  
  return null;
};

/**
 * Gibt die deutsche Bezeichnung für eine Einwand-Kategorie zurück
 */
const getCategoryLabel = (type) => {
  const labels = {
    preis: 'Preis',
    zeit: 'Zeit',
    interesse: 'Interesse',
    skepsis: 'Skepsis',
  };
  return labels[type] || type;
};

/**
 * Holt 3 passende Antworten aus Supabase
 * @param {string} objectionType - Typ des Einwands ('preis', 'zeit', 'interesse', 'skepsis')
 * @param {string} companyId - Optional: Company ID für firmenspezifische Antworten
 * @param {string} vertical - Optional: Vertical für branchenspezifische Antworten
 * @returns {Promise<Array>} - Array von Antworten
 */
export const fetchObjectionResponses = async (objectionType, companyId = null, vertical = null) => {
  try {
    // Baue Filter auf
    let query = supabase
      .from('objection_responses')
      .select('*')
      .eq('is_active', true);
    
    // Filter nach Einwand-Typ (flexibel)
    const categoryLabel = getCategoryLabel(objectionType);
    query = query.or(`objection_type.ilike.%${objectionType}%,objection_type.ilike.%${categoryLabel}%`);
    
    // Optional: Filter nach Company ID (firmenspezifisch oder allgemein)
    if (companyId) {
      // Verwende separate Filter für company_id
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }
    
    // Optional: Filter nach Vertical
    if (vertical) {
      query = query.or(`vertical.eq.${vertical},vertical.is.null`);
    }
    
    // Limit und Order
    query = query
      .order('times_used', { ascending: false })
      .order('success_rate', { ascending: false, nullsFirst: false })
      .limit(3);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase Fehler beim Abrufen von Einwand-Antworten:', error);
      return [];
    }
    
    // Sortiere nach Erfolgsrate (falls vorhanden) und gib Top 3 zurück
    const sorted = (data || []).sort((a, b) => {
      const scoreA = a.success_rate || a.times_used || 0;
      const scoreB = b.success_rate || b.times_used || 0;
      return scoreB - scoreA;
    });
    
    return sorted.slice(0, 3).map(item => ({
      id: item.id,
      type: item.objection_type,
      responseShort: item.response_short,
      responseFull: item.response_full || item.response_short,
      technique: item.response_technique,
      followUpQuestion: item.follow_up_question,
      timesUsed: item.times_used || 0,
      successRate: item.success_rate,
    }));
  } catch (error) {
    console.error('Fehler beim Abrufen von Einwand-Antworten:', error);
    return [];
  }
};

/**
 * Aktualisiert die Nutzungsstatistik einer Antwort
 * @param {string} responseId - ID der Antwort
 */
export const trackResponseUsage = async (responseId) => {
  try {
    const { data: current } = await supabase
      .from('objection_responses')
      .select('times_used')
      .eq('id', responseId)
      .single();
    
    if (current) {
      await supabase
        .from('objection_responses')
        .update({ times_used: (current.times_used || 0) + 1 })
        .eq('id', responseId);
    }
  } catch (error) {
    console.error('Fehler beim Tracking der Antwort-Nutzung:', error);
    // Nicht kritisch - einfach loggen
  }
};

