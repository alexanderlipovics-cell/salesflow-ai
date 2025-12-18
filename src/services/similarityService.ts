/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SIMILARITY SERVICE                                                        ║
 * ║  Berechnet wie stark User-Text von CHIEF-Vorschlag abweicht               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Kombiniert Jaccard (Wort-basiert) und Levenshtein (Zeichen-basiert)
 * Similarity für optimale Erkennung von Änderungen.
 */

import type { 
  ChangeType, 
  SimilarityResult, 
  QuickChangeResult,
  Significance,
} from '../types/teach';

// =============================================================================
// JACCARD SIMILARITY
// =============================================================================

/**
 * Jaccard Similarity zwischen zwei Texten
 * Basiert auf Wort-Sets
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const normalize = (t: string): Set<string> => {
    const words = t
      .toLowerCase()
      .replace(/[^\w\süöäß]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0);
    return new Set(words);
  };
  
  const set1 = normalize(text1);
  const set2 = normalize(text2);
  
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// =============================================================================
// LEVENSHTEIN DISTANCE
// =============================================================================

/**
 * Levenshtein Distance (Edit Distance)
 * Anzahl der Änderungen um text1 in text2 zu verwandeln
 */
export function levenshteinDistance(text1: string, text2: string): number {
  const m = text1.length;
  const n = text2.length;
  
  // Early exit für leere Strings
  if (m === 0) return n;
  if (n === 0) return m;
  
  // Für Performance: nur 2 Zeilen statt volle Matrix
  let prevRow = Array.from({ length: n + 1 }, (_, i) => i);
  let currRow = new Array(n + 1).fill(0);
  
  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    
    for (let j = 1; j <= n; j++) {
      const cost = text1[i - 1] === text2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // Deletion
        currRow[j - 1] + 1,  // Insertion
        prevRow[j - 1] + cost // Substitution
      );
    }
    
    [prevRow, currRow] = [currRow, prevRow];
  }
  
  return prevRow[n];
}

/**
 * Levenshtein Similarity (0-1)
 */
export function levenshteinSimilarity(text1: string, text2: string): number {
  const maxLen = Math.max(text1.length, text2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(text1, text2);
  return 1 - (distance / maxLen);
}

// =============================================================================
// COMBINED SIMILARITY
// =============================================================================

export interface AnalyzeSimilarityOptions {
  jaccardWeight?: number;
  levenshteinWeight?: number;
  significanceThreshold?: number;
}

/**
 * Kombinierte Similarity-Analyse
 */
export function analyzeSimilarity(
  original: string,
  final: string,
  options: AnalyzeSimilarityOptions = {}
): SimilarityResult {
  const {
    jaccardWeight = 0.6,
    levenshteinWeight = 0.4,
    significanceThreshold = 0.85,
  } = options;
  
  const jaccard = jaccardSimilarity(original, final);
  const levenshtein = levenshteinSimilarity(original, final);
  
  const combined = (jaccard * jaccardWeight) + (levenshtein * levenshteinWeight);
  
  const lengthDiff = Math.abs(original.length - final.length);
  const lengthRatio = original.length > 0 
    ? final.length / original.length 
    : (final.length > 0 ? 2 : 1);
  
  // Significance
  const isSignificant = combined < significanceThreshold || lengthDiff > 15;
  
  let significance: Significance;
  if (combined >= 0.95) significance = 'none';
  else if (combined >= 0.9) significance = 'low';
  else if (combined >= 0.7) significance = 'medium';
  else significance = 'high';
  
  return {
    combined,
    jaccard,
    levenshtein,
    isSignificant,
    significance,
    lengthDiff,
    lengthRatio,
  };
}

// =============================================================================
// QUICK CHANGE DETECTION
// =============================================================================

// Emoji Regex für bessere Erkennung
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

/**
 * Schnelle Erkennung von Änderungstypen (ohne Claude)
 */
export function detectChangesQuick(
  original: string,
  final: string
): QuickChangeResult {
  const changes: ChangeType[] = [];
  
  // Länge
  if (final.length < original.length * 0.7) {
    changes.push('shorter_more_direct');
  } else if (final.length > original.length * 1.3) {
    changes.push('longer_more_detailed');
  }
  
  // Emojis
  const originalEmojis = (original.match(EMOJI_REGEX) || []).length;
  const finalEmojis = (final.match(EMOJI_REGEX) || []).length;
  
  if (finalEmojis > originalEmojis) {
    changes.push('emoji_added');
  } else if (finalEmojis < originalEmojis) {
    changes.push('emoji_removed');
  }
  
  // Formalität (Sie vs du)
  const informalMarkersLower = ['hey', 'hi', 'du', 'dir', 'dein', 'deine'];
  const formalMarkers = ['Sie', 'Ihnen', 'Ihr', 'sehr geehrte', 'mit freundlichen'];
  
  const originalInformal = informalMarkersLower.filter(m => 
    original.toLowerCase().includes(m)
  ).length;
  const finalInformal = informalMarkersLower.filter(m => 
    final.toLowerCase().includes(m)
  ).length;
  
  const originalFormal = formalMarkers.filter(m => 
    original.includes(m)
  ).length;
  const finalFormal = formalMarkers.filter(m => 
    final.includes(m)
  ).length;
  
  if (finalInformal > originalInformal && finalFormal <= originalFormal) {
    changes.push('informal_tone');
  } else if (finalFormal > originalFormal && finalInformal <= originalInformal) {
    changes.push('formal_tone');
  }
  
  // Fragen
  const originalQuestions = (original.match(/\?/g) || []).length;
  const finalQuestions = (final.match(/\?/g) || []).length;
  
  if (finalQuestions > originalQuestions) {
    changes.push('question_added');
  } else if (finalQuestions < originalQuestions) {
    changes.push('question_removed');
  }
  
  // Dringlichkeit
  const urgencyMarkers = ['jetzt', 'heute', 'sofort', 'schnell', 'limitiert', 'nur noch', 'letzte chance'];
  const originalUrgency = urgencyMarkers.filter(m => 
    original.toLowerCase().includes(m)
  ).length;
  const finalUrgency = urgencyMarkers.filter(m => 
    final.toLowerCase().includes(m)
  ).length;
  
  if (finalUrgency > originalUrgency) {
    changes.push('urgency_added');
  } else if (finalUrgency < originalUrgency) {
    changes.push('urgency_removed');
  }
  
  // Begrüßung
  const greetings = ['hallo', 'hey', 'hi', 'guten', 'liebe', 'servus', 'moin', 'grüß'];
  const originalHasGreeting = greetings.some(g => 
    original.toLowerCase().slice(0, 50).includes(g)
  );
  const finalHasGreeting = greetings.some(g => 
    final.toLowerCase().slice(0, 50).includes(g)
  );
  
  if (originalHasGreeting !== finalHasGreeting) {
    changes.push('greeting_changed');
  }
  
  // Begeisterung (Ausrufezeichen)
  const originalExclamations = (original.match(/!/g) || []).length;
  const finalExclamations = (final.match(/!/g) || []).length;
  
  if (finalExclamations > originalExclamations + 1) {
    changes.push('enthusiasm_added');
  } else if (finalExclamations < originalExclamations - 1) {
    changes.push('enthusiasm_reduced');
  }
  
  // Pattern erkennen basierend auf Kombinationen
  let pattern: string | undefined;
  
  if (changes.includes('shorter_more_direct') && changes.includes('informal_tone')) {
    pattern = 'casual_direct';
  } else if (changes.includes('shorter_more_direct')) {
    pattern = 'concise_style';
  } else if (changes.includes('question_added')) {
    pattern = 'engagement_focus';
  } else if (changes.includes('emoji_added') && changes.includes('informal_tone')) {
    pattern = 'friendly_casual';
  } else if (changes.includes('formal_tone')) {
    pattern = 'professional_formal';
  } else if (changes.includes('urgency_added')) {
    pattern = 'urgency_focus';
  }
  
  // Confidence basierend auf Anzahl erkannter Änderungen
  const confidence = changes.length > 0 
    ? Math.min(0.9, 0.5 + (changes.length * 0.1))
    : 0.3;
  
  return {
    changes,
    pattern,
    confidence,
  };
}

// =============================================================================
// HELPER: Quick Similarity Check (für Client-Side Filtering)
// =============================================================================

/**
 * Schnelle Prüfung ob Texte zu ähnlich sind (für Skip-Logik)
 */
export function quickSimilarityCheck(
  original: string, 
  final: string,
  threshold: number = 0.95
): boolean {
  // Identische Texte
  if (original === final) return true;
  
  // Sehr kleine Änderung (< 5 Zeichen)
  if (Math.abs(original.length - final.length) < 5) {
    const shorter = original.length < final.length ? original : final;
    const longer = original.length < final.length ? final : original;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (shorter[i] === longer[i]) matches++;
    }
    
    const similarity = matches / longer.length;
    if (similarity > threshold) return true;
  }
  
  return false;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  jaccardSimilarity,
  levenshteinDistance,
  levenshteinSimilarity,
  analyzeSimilarity,
  detectChangesQuick,
  quickSimilarityCheck,
};

