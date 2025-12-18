/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  MLM SCRIPT SERVICE                                                        ║
 * ║  Frontend-Service für MLM-spezifische Scripts                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from './apiConfig';

// API URL aus zentraler Config
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

/**
 * Holt alle Scripts für ein MLM-Unternehmen
 * @param {string} mlmCompany - Company-Slug (z.B. "zinzino")
 * @param {string} category - Optional - Kategorie (z.B. "pitches")
 * @returns {Promise<Object>}
 */
export const getMLMScripts = async (mlmCompany, category = null) => {
  try {
    let url = `${getApiUrl()}/api/v2/scripts/mlm/${mlmCompany}`;
    if (category) {
      url += `?category=${category}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching MLM scripts:', error);
    throw error;
  }
};

/**
 * Holt Scripts einer spezifischen Kategorie
 * @param {string} mlmCompany - Company-Slug
 * @param {string} category - Kategorie (z.B. "pitches", "einwand_handling")
 * @returns {Promise<Object>}
 */
export const getMLMScriptsByCategory = async (mlmCompany, category) => {
  try {
    const response = await fetch(
      `${getApiUrl()}/api/v2/scripts/mlm/${mlmCompany}/${category}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching MLM scripts by category:', error);
    throw error;
  }
};

/**
 * Holt ein einzelnes Script per ID
 * @param {string} mlmCompany - Company-Slug
 * @param {string} category - Kategorie
 * @param {string} scriptId - Script-ID
 * @param {Object} variables - Optional - Variablen zum Ersetzen (z.B. {Name: "Max"})
 * @returns {Promise<Object>}
 */
export const getMLMScriptById = async (mlmCompany, category, scriptId, variables = null) => {
  try {
    let url = `${getApiUrl()}/api/v2/scripts/mlm/${mlmCompany}/${category}/${scriptId}`;
    
    if (variables) {
      const varsString = encodeURIComponent(JSON.stringify(variables));
      url += `?variables=${varsString}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching MLM script by ID:', error);
    throw error;
  }
};

/**
 * Schlägt ein passendes Script basierend auf Kontext vor
 * @param {string} mlmCompany - Company-Slug
 * @param {string} context - Beschreibung der Situation
 * @param {string} channel - Optional - Kanal (whatsapp, instagram, linkedin)
 * @param {string} situationType - Optional - Typ (cold, warm)
 * @returns {Promise<Object>}
 */
export const suggestMLMScript = async (mlmCompany, context, channel = null, situationType = null) => {
  try {
    let url = `${getApiUrl()}/api/v2/scripts/mlm/${mlmCompany}/suggest?context=${encodeURIComponent(context)}`;
    
    if (channel) {
      url += `&channel=${channel}`;
    }
    if (situationType) {
      url += `&situation_type=${situationType}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error suggesting MLM script:', error);
    throw error;
  }
};

/**
 * Findet passende Scripts basierend auf einer Situation
 * @param {string} mlmCompany - Company-Slug
 * @param {string} situation - Situation (z.B. "einwand_zu_teuer")
 * @returns {Promise<Object>}
 */
export const getScriptsBySituation = async (mlmCompany, situation) => {
  try {
    const response = await fetch(
      `${getApiUrl()}/api/v2/scripts/mlm/${mlmCompany}/situation/${situation}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching scripts by situation:', error);
    throw error;
  }
};

/**
 * Prüft einen Text auf MLM-spezifische Compliance-Verstöße
 * @param {string} mlmCompany - Company-Slug
 * @param {string} text - Zu prüfender Text
 * @returns {Promise<Object>}
 */
export const checkMLMCompliance = async (mlmCompany, text) => {
  try {
    const response = await fetch(
      `${getApiUrl()}/api/v2/scripts/mlm/${mlmCompany}/compliance/check?text=${encodeURIComponent(text)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking MLM compliance:', error);
    throw error;
  }
};

/**
 * Gibt alle verfügbaren MLM-Unternehmen zurück
 * @returns {Promise<Object>}
 */
export const getAvailableMLMCompanies = async () => {
  try {
    const response = await fetch(
      `${getApiUrl()}/api/v2/scripts/mlm/companies`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching available MLM companies:', error);
    throw error;
  }
};

/**
 * Gibt alle Kategorien für ein MLM-Unternehmen zurück
 * @param {string} mlmCompany - Company-Slug
 * @returns {Promise<Object>}
 */
export const getMLMCategories = async (mlmCompany) => {
  try {
    const response = await fetch(
      `${getApiUrl()}/api/v2/scripts/mlm/${mlmCompany}/categories`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching MLM categories:', error);
    throw error;
  }
};

/**
 * Ersetzt Variablen in einem Script-Text
 * @param {string} text - Script-Text mit Variablen (z.B. "[Name]")
 * @param {Object} variables - Variablen-Werte (z.B. {Name: "Max"})
 * @returns {string}
 */
export const replaceScriptVariables = (text, variables) => {
  let result = text;
  
  for (const [key, value] of Object.entries(variables)) {
    // Ersetze [Key] und [KEY]
    result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
    result = result.replace(new RegExp(`\\[${key.toUpperCase()}\\]`, 'g'), value);
  }
  
  return result;
};

// =============================================================================
// KATEGORIE-LABELS (für UI)
// =============================================================================

export const MLM_CATEGORY_LABELS = {
  pitches: {
    label: '🎯 Pitches',
    description: 'Eröffnungs-Scripts für verschiedene Situationen',
    color: '#3b82f6',
  },
  wert_fragen: {
    label: '💎 Wert-Fragen',
    description: 'Value-basierte Fragen zur Bedarfsanalyse',
    color: '#10b981',
  },
  einwand_handling: {
    label: '🛡️ Einwand-Handling',
    description: 'Antworten auf häufige Einwände',
    color: '#ef4444',
  },
  follow_up: {
    label: '📬 Follow-Up',
    description: 'Nachfass-Scripts für verschiedene Phasen',
    color: '#8b5cf6',
  },
  ghostbuster: {
    label: '👻 Ghostbuster',
    description: 'Scripts für inaktive/ghostete Kontakte',
    color: '#f59e0b',
  },
  closing: {
    label: '🎯 Closing',
    description: 'Abschluss-Scripts',
    color: '#22c55e',
  },
};

