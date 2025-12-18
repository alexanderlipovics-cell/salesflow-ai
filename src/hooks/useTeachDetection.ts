/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  USE TEACH DETECTION HOOK                                                  ║
 * ║  Hook für das automatische Erkennen von Korrekturen                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Dieser Hook wird verwendet um automatisch zu erkennen wenn ein User
 * einen CHIEF-Vorschlag ändert und das Teach-Modal anzuzeigen.
 * 
 * Usage:
 * ```tsx
 * const { checkCorrection, showModal, modalData, closeModal, handleFeedbackComplete } = useTeachDetection();
 * 
 * // Nach dem Senden einer Nachricht:
 * await checkCorrection(chiefSuggestion, userFinalText, { channel: 'whatsapp' });
 * 
 * // Im Render:
 * {showModal && modalData && (
 *   <TeachFeedbackModal
 *     visible={showModal}
 *     correctionId={modalData.correctionId}
 *     originalText={modalData.originalText}
 *     correctedText={modalData.correctedText}
 *     suggestedRule={modalData.suggestedRule}
 *     changeSummary={modalData.changeSummary}
 *     onClose={closeModal}
 *     onComplete={handleFeedbackComplete}
 *   />
 * )}
 * ```
 */

import { useState, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface SuggestedRulePreview {
  title: string;
  instruction: string;
  ruleType: string;
  confidence?: number;
}

export interface DetectionResult {
  should_show_modal: boolean;
  correction_id?: string;
  similarity_score: number;
  change_significance: string;
  suggested_rule?: SuggestedRulePreview;
  reason?: string;
  change_summary?: string[];
}

export interface ModalData {
  correctionId: string;
  originalText: string;
  correctedText: string;
  suggestedRule?: SuggestedRulePreview;
  changeSummary: string[];
}

export interface DetectionContext {
  channel?: string;
  leadStatus?: string;
  messageType?: string;
  leadId?: string;
  disgType?: string;
}

export interface UseTeachDetectionOptions {
  /** API Base URL */
  apiBaseUrl?: string;
  /** Callback wenn eine Regel erstellt wurde */
  onRuleCreated?: (ruleTitle: string) => void;
  /** Callback wenn Feedback abgeschlossen ist */
  onFeedbackComplete?: (feedback: string, ruleCreated: boolean) => void;
  /** Minimum similarity für Quick-Skip (Client-side) */
  minSimilarityThreshold?: number;
}

export interface UseTeachDetectionReturn {
  /** Prüft ob eine Korrektur signifikant ist und zeigt ggf. Modal */
  checkCorrection: (
    original: string, 
    final: string, 
    context?: DetectionContext
  ) => Promise<boolean>;
  /** Ob das Modal angezeigt werden soll */
  showModal: boolean;
  /** Daten für das Modal (wenn showModal=true) */
  modalData: ModalData | null;
  /** Schließt das Modal */
  closeModal: () => void;
  /** Handler für Feedback-Abschluss */
  handleFeedbackComplete: (feedback: string, ruleCreated: boolean, ruleTitle?: string) => void;
  /** Ob gerade eine Erkennung läuft */
  isDetecting: boolean;
  /** Letzter Fehler */
  error: string | null;
  /** Letzte Detection Result (für Debugging) */
  lastResult: DetectionResult | null;
}

// ============================================================================
// HOOK
// ============================================================================

export function useTeachDetection(
  options: UseTeachDetectionOptions = {}
): UseTeachDetectionReturn {
  const {
    apiBaseUrl = '/api/v1',
    onRuleCreated,
    onFeedbackComplete,
    minSimilarityThreshold = 0.95,
  } = options;
  
  // State
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DetectionResult | null>(null);
  
  // Ref um doppelte Aufrufe zu verhindern
  const pendingCheck = useRef(false);
  
  /**
   * Schnelle Client-seitige Prüfung ob Texte zu ähnlich sind
   */
  const quickSimilarityCheck = useCallback((original: string, final: string): boolean => {
    // Identische Texte
    if (original === final) return true;
    
    // Sehr kleine Änderung (< 5 Zeichen)
    if (Math.abs(original.length - final.length) < 5) {
      // Einfache Levenshtein-ähnliche Prüfung
      const shorter = original.length < final.length ? original : final;
      const longer = original.length < final.length ? final : original;
      
      let matches = 0;
      for (let i = 0; i < shorter.length; i++) {
        if (shorter[i] === longer[i]) matches++;
      }
      
      const similarity = matches / longer.length;
      if (similarity > minSimilarityThreshold) return true;
    }
    
    return false;
  }, [minSimilarityThreshold]);
  
  /**
   * Prüft ob eine Korrektur signifikant ist und zeigt ggf. Modal
   */
  const checkCorrection = useCallback(async (
    original: string,
    final: string,
    context?: DetectionContext,
  ): Promise<boolean> => {
    // Verhindere doppelte Aufrufe
    if (pendingCheck.current) {
      return false;
    }
    
    // Quick client-side check
    if (quickSimilarityCheck(original, final)) {
      return false;
    }
    
    pendingCheck.current = true;
    setIsDetecting(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiBaseUrl}/brain/corrections/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          original_suggestion: original,
          user_final_text: final,
          channel: context?.channel,
          lead_status: context?.leadStatus,
          message_type: context?.messageType,
          lead_id: context?.leadId,
          disg_type: context?.disgType,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Detection failed: ${response.status}`);
      }
      
      const result: DetectionResult = await response.json();
      setLastResult(result);
      
      if (result.should_show_modal && result.correction_id) {
        setModalData({
          correctionId: result.correction_id,
          originalText: original,
          correctedText: final,
          suggestedRule: result.suggested_rule,
          changeSummary: result.change_summary || [],
        });
        setShowModal(true);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Detection error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsDetecting(false);
      pendingCheck.current = false;
    }
  }, [apiBaseUrl, quickSimilarityCheck]);
  
  /**
   * Schließt das Modal
   */
  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalData(null);
  }, []);
  
  /**
   * Handler für Feedback-Abschluss
   */
  const handleFeedbackComplete = useCallback((
    feedback: string,
    ruleCreated: boolean,
    ruleTitle?: string,
  ) => {
    // Callback aufrufen wenn Regel erstellt wurde
    if (ruleCreated && ruleTitle && onRuleCreated) {
      onRuleCreated(ruleTitle);
    }
    
    // Allgemeiner Callback
    if (onFeedbackComplete) {
      onFeedbackComplete(feedback, ruleCreated);
    }
    
    // Modal schließen
    closeModal();
    
    // Logging für Analytics
    console.log('Teach Feedback:', { feedback, ruleCreated, ruleTitle });
  }, [onRuleCreated, onFeedbackComplete, closeModal]);
  
  return {
    checkCorrection,
    showModal,
    modalData,
    closeModal,
    handleFeedbackComplete,
    isDetecting,
    error,
    lastResult,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useTeachDetection;

