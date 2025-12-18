import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

export const useSmartImport = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);

    // Detect if text should be analyzed
    const shouldAnalyze = useCallback((text) => {
        if (!text || text.length < 50) return false;

        // Conversation patterns
        const hasTimestamp = /\d{1,2}:\d{2}/.test(text);
        const hasMultipleLines = text.split('\n').length > 5;
        const hasChatIndicator = /du hast.*gesendet|gesehen|online|zugestellt/i.test(text);
        const hasDayTime = /(Mo|Di|Mi|Do|Fr|Sa|So),?\s+\d{1,2}:\d{2}/i.test(text);

        // Meeting notes patterns
        const hasMeetingKeywords = /termin|meeting|call|gespräch|budget|nächster schritt|provision|deal/i.test(text);
        const isShortEnough = text.length < 600;

        // Is conversation?
        if ((hasTimestamp && hasMultipleLines) || hasChatIndicator || hasDayTime) {
            return 'conversation';
        }

        // Is meeting notes?
        if (hasMeetingKeywords && isShortEnough && text.length > 50) {
            return 'meeting_notes';
        }

        return false;
    }, []);

    // Analyze text
    const analyzeText = useCallback(async (text) => {
        setIsAnalyzing(true);
        setError(null);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/smart-import/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            // Ignoriere Fehler stillschweigend - Chat funktioniert trotzdem
            if (!response.ok) {
                console.log(`Smart import analyze endpoint not available (${response.status}) - continuing without analysis`);
                return null;
            }

            const data = await response.json();

            if (data.success && data.result?.input_type !== 'question') {
                setAnalysisResult(data.result);
                return data.result;
            }

            return null;
        } catch (err) {
            // Fehler stillschweigend ignorieren - Chat funktioniert trotzdem
            console.log('Smart import not available - continuing without analysis:', err.message);
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    // Save lead from analysis
    const saveLead = useCallback(async (analysis) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/smart-import/save-lead`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lead: analysis.lead,
                    notes: analysis.crm_note,
                    follow_up_days: analysis.follow_up_days,
                    status: analysis.status,
                    first_message: analysis.customer_message,
                    channel: analysis.lead?.platform
                })
            });

            const data = await response.json();

            if (data.success) {
                setAnalysisResult(null);
                return data;
            }

            throw new Error('Failed to save lead');

        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // Generate magic send link
    const getMagicLink = useCallback(async (platform, message, lead) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/api/magic-send/generate-link`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    platform,
                    message,
                    phone: lead.phone || lead.whatsapp,
                    email: lead.email,
                    instagram_handle: lead.instagram,
                    telegram_handle: lead.telegram
                })
            });

            const data = await response.json();

            if (data.success && data.deep_link) {
                window.open(data.deep_link, '_blank');
                return data;
            }

            // Fallback
            if (data.fallback_link) {
                window.open(data.fallback_link, '_blank');
                return data;
            }

            throw new Error(data.error || 'Could not generate link');

        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // Clear analysis
    const clearAnalysis = useCallback(() => {
        setAnalysisResult(null);
        setError(null);
    }, []);

    return {
        isAnalyzing,
        analysisResult,
        error,
        shouldAnalyze,
        analyzeText,
        saveLead,
        getMagicLink,
        clearAnalysis,
        setAnalysisResult
    };
};

export default useSmartImport;
