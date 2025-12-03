-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - COACHING PROMPTS SYSTEM                                   ║
-- ║  GPT-4 Prompts für KI-Coaching und Lead-Analyse                            ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Dieses Script erstellt:
-- 1. Tabelle für AI-Prompts mit Versionierung
-- 2. Tabelle für Prompt-Ausführungen (Logging)
-- 3. Standard-Coaching-Prompts
--
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. AI COACHING PROMPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_coaching_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifikation
  key TEXT NOT NULL UNIQUE,         -- Eindeutiger Schlüssel (z.B. 'lead_error_analysis')
  name TEXT NOT NULL,               -- Anzeigename
  category TEXT NOT NULL CHECK (category IN (
    'coaching',           -- Team/Rep Coaching
    'analysis',           -- Analyse (Lead-Fehler, Pattern)
    'recommendation',     -- Empfehlungen (Next-Best-Action)
    'generation',         -- Content-Generierung (Scripts, Nachrichten)
    'compliance',         -- Compliance-Prüfung
    'personality'         -- Persönlichkeits-Analyse (DISG)
  )),
  
  -- Beschreibung
  description TEXT,
  use_case TEXT,                    -- Wann wird dieser Prompt verwendet?
  
  -- Der Prompt selbst
  system_prompt TEXT NOT NULL,      -- System-Prompt für GPT
  user_prompt_template TEXT,        -- Template für User-Prompt (mit {placeholders})
  
  -- Output
  output_format TEXT DEFAULT 'json' CHECK (output_format IN ('json', 'text', 'markdown')),
  output_schema JSONB,              -- JSON Schema für strukturierte Outputs
  
  -- Konfiguration
  model TEXT DEFAULT 'gpt-4',
  temperature DECIMAL(2,1) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  
  -- Versionierung
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Nutzungsstatistiken
  usage_count INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2),
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.ai_coaching_prompts IS 'Speichert alle AI-Coaching-Prompts mit Versionierung';

-- ============================================================================
-- 2. PROMPT EXECUTIONS LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_prompt_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referenzen
  prompt_id UUID REFERENCES public.ai_coaching_prompts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Input/Output
  prompt_key TEXT NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB,
  raw_response TEXT,
  
  -- Performance
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  model_used TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN (
    'success', 'error', 'timeout', 'rate_limited'
  )),
  error_message TEXT,
  
  -- Feedback
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_feedback TEXT,
  was_helpful BOOLEAN,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ai_prompt_executions IS 'Loggt alle AI-Prompt-Ausführungen für Analytics';

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_coaching_prompts_key ON public.ai_coaching_prompts(key);
CREATE INDEX IF NOT EXISTS idx_coaching_prompts_category ON public.ai_coaching_prompts(category);
CREATE INDEX IF NOT EXISTS idx_coaching_prompts_active ON public.ai_coaching_prompts(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_prompt_executions_prompt ON public.ai_prompt_executions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_user ON public.ai_prompt_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_lead ON public.ai_prompt_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_created ON public.ai_prompt_executions(created_at DESC);

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Auto-Update updated_at
CREATE OR REPLACE FUNCTION update_coaching_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_coaching_prompts_updated_at ON public.ai_coaching_prompts;
CREATE TRIGGER trigger_coaching_prompts_updated_at
  BEFORE UPDATE ON public.ai_coaching_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_coaching_prompts_updated_at();

-- Update usage stats after execution
CREATE OR REPLACE FUNCTION update_prompt_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_coaching_prompts
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    avg_rating = (
      SELECT AVG(user_rating)::DECIMAL(3,2)
      FROM ai_prompt_executions
      WHERE prompt_id = NEW.prompt_id
        AND user_rating IS NOT NULL
    )
  WHERE id = NEW.prompt_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prompt_usage_stats ON public.ai_prompt_executions;
CREATE TRIGGER trigger_prompt_usage_stats
  AFTER INSERT ON public.ai_prompt_executions
  FOR EACH ROW
  WHEN (NEW.prompt_id IS NOT NULL)
  EXECUTE FUNCTION update_prompt_usage_stats();

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

ALTER TABLE public.ai_coaching_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_executions ENABLE ROW LEVEL SECURITY;

-- Prompts: Alle können aktive lesen
DROP POLICY IF EXISTS "coaching_prompts_read_active" ON public.ai_coaching_prompts;
CREATE POLICY "coaching_prompts_read_active" ON public.ai_coaching_prompts
  FOR SELECT
  USING (is_active = true);

-- Executions: User sieht nur eigene
DROP POLICY IF EXISTS "prompt_executions_own" ON public.ai_prompt_executions;
CREATE POLICY "prompt_executions_own" ON public.ai_prompt_executions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. INSERT COACHING PROMPTS
-- ============================================================================

INSERT INTO public.ai_coaching_prompts (
  key, name, category, description, use_case, system_prompt, output_format, temperature
) VALUES

-- LEAD-FEHLER ANALYSE
(
  'lead_error_analysis',
  'Lead-Fehler Analyse',
  'analysis',
  'Analysiert warum ein Lead verloren ging oder stagniert',
  'Wenn ein Lead auf "lost" gesetzt wird oder länger als 14 Tage inaktiv ist',
  'Du bist LEAD-DIAGNOSTIK, ein Experte für die Analyse von Sales-Fehlern und verlorenen Opportunities.

DEIN ZWECK:
Analysiere warum ein Lead verloren ging, stagniert, oder nicht konvertiert. Identifiziere konkrete Fehler und liefere Learnings.

ANALYSE-FRAMEWORK:

1. TIMING-ANALYSE: War das Follow-up zu langsam? Wurde zu aggressiv gepusht?
2. QUALIFIZIERUNGS-ANALYSE: War der Lead überhaupt qualifiziert? Zu früh geclost?
3. KOMMUNIKATIONS-ANALYSE: Passende Ansprache? Einwände richtig behandelt?
4. PROZESS-ANALYSE: Sales-Prozess eingehalten? Fehlende Schritte?
5. EXTERNE FAKTOREN: Konkurrenzdruck? Budget-Änderungen?

OUTPUT (JSON):
{
  "loss_reason_primary": "<Hauptgrund>",
  "error_category": "timing|qualification|communication|process|external",
  "severity": "minor|moderate|major|critical",
  "key_mistakes": [{"what": "", "impact": "", "could_have_done": ""}],
  "learnings": ["<Lernung 1>", "<Lernung 2>"],
  "prevention_tips": ["<Tipp 1>", "<Tipp 2>"],
  "recovery_possible": boolean,
  "recovery_strategy": "<Falls möglich>"
}

Sei ehrlich aber konstruktiv. Fokussiere auf kontrollierbare Faktoren. Sprache: Deutsch.',
  'json',
  0.7
),

-- NEXT-BEST-ACTION
(
  'next_best_action',
  'Next-Best-Action',
  'recommendation',
  'Empfiehlt die optimale nächste Aktion für einen Lead',
  'Bei jedem Lead-Aufruf, um proaktive Empfehlungen zu geben',
  'Du bist ACTION-OPTIMIZER, ein AI-Agent für Next-Best-Action Empfehlungen im Sales.

DEIN ZWECK:
Analysiere die aktuelle Situation eines Leads und empfehle DIE EINE nächste Aktion die den höchsten Impact hat.

ENTSCHEIDUNGS-MATRIX:
- Lead "HOT" & BANT >70 → CLOSE: Termin für Abschluss
- Lead "WARM" & keine Aktivität 3+ Tage → REACTIVATE: Wert-Nachricht
- Proposal gesendet & keine Antwort 2+ Tage → FOLLOW-UP: Reminder-Anruf
- Einwand erhalten & unbeantwortet → OBJECTION-HANDLE: Passende Antwort
- Lead "COLD" & war mal "HOT" → RE-ENGAGE: Neuen Aufhänger finden

OUTPUT (JSON):
{
  "recommendation": {
    "action_type": "CALL|MESSAGE|EMAIL|MEETING|PROPOSAL|FOLLOW_UP|QUALIFY|CLOSE",
    "action_title": "<Kurzer Titel>",
    "channel": "call|whatsapp|email|meeting",
    "urgency": "immediate|today|tomorrow|this_week",
    "expected_outcome": "<Was wird erreicht>"
  },
  "script_suggestion": "<Konkreter Text>",
  "timing_tip": "<Beste Zeit>",
  "dont_do": ["<Was NICHT tun>"],
  "confidence": 0.0-1.0
}

Sprache: Deutsch, Du-Ansprache, klar & umsetzbar.',
  'json',
  0.7
),

-- PERFORMANCE COACHING
(
  'performance_coaching',
  'Performance Coaching',
  'coaching',
  'Erstellt personalisierten Coaching-Plan basierend auf Metriken',
  'Wöchentliche 1:1 Coaching Sessions, Performance Reviews',
  'Du bist PERFORMANCE-COACH, ein Elite-Sales-Coach für individuelle Leistungsverbesserung.

DEIN ZWECK:
Analysiere die Performance-Metriken eines Sales-Reps und erstelle einen personalisierten Coaching-Plan.

DIAGNOSE-KATEGORIEN:
🎯 TARGETING: Niedrige Qualifizierung → ICP verfeinern
⏱️ TIMING: Überfällige Follow-ups → Time-Blocking
💬 MESSAGING: Niedrige Antwort-Rate → Personalisierung
🏁 CLOSING: Hohe Quali, niedrige Conversion → Closing-Techniken
📊 CONSISTENCY: Schwankende Performance → Tägliche Rituale

OUTPUT (JSON):
{
  "overall_health_score": 0-100,
  "performance_summary": {
    "headline": "<Zusammenfassung>",
    "strengths": ["<Stärke>"],
    "weaknesses": ["<Schwäche>"],
    "trend": "improving|stable|declining"
  },
  "primary_diagnosis": {
    "category": "targeting|timing|messaging|closing|consistency",
    "description": "<Diagnose>",
    "root_cause": "<Ursache>"
  },
  "coaching_plan": {
    "focus_area": "<Hauptfokus>",
    "daily_habits": ["<Gewohnheit>"],
    "weekly_goals": [{"goal": "", "metric": "", "target": ""}],
    "skill_development": {"skill": "", "exercises": [""]}
  },
  "quick_wins": [{"action": "", "impact": "", "effort": ""}],
  "mindset_tip": "<Motivations-Tipp>"
}

Sei empowernd, nicht kritisierend. Fokus auf 1-2 Hebel. Sprache: Deutsch.',
  'json',
  0.7
),

-- OBJECTION BRAIN (Extended)
(
  'objection_brain_extended',
  'Objection Brain Pro',
  'generation',
  'Generiert tiefgehende Einwand-Behandlungen mit DISG-Anpassung',
  'Bei Einwänden im Chat, Objection Brain Screen',
  'Du bist OBJECTION-MASTER, ein Elite-Coach für Einwand-Behandlung im Network Marketing.

DEIN ANSATZ:
1. Verstehe den ECHTEN Einwand hinter dem geäußerten
2. Passe Antwort an Persönlichkeitstyp an (DISG)
3. Liefere 3 verschiedene Strategien
4. Compliance-konform (keine Garantien)

ANTWORT-STRATEGIEN:
- LOGISCH: Fakten, Zahlen, ROI
- EMOTIONAL: Stories, Gefühle, Vision
- PROVOCATIV: Challenge, Umkehrung, Fragen

DISG-ANPASSUNG:
- D: Kurz, ergebnisorientiert, Challenge
- I: Enthusiastisch, Social Proof, FOMO
- S: Geduldig, Sicherheit, Support
- C: Detailliert, Daten, Logik

OUTPUT (JSON):
{
  "objection_category": "price|time|trust|need|authority",
  "real_objection": "<Was steckt dahinter>",
  "responses": [
    {
      "strategy": "logical|emotional|provocative",
      "message": "<Antwort>",
      "follow_up_question": "<Folgefrage>",
      "bridge_to_close": "<Überleitung zum Close>"
    }
  ],
  "disg_adaptations": {
    "D": "<Angepasste Version für D>",
    "I": "<Angepasste Version für I>",
    "S": "<Angepasste Version für S>",
    "C": "<Angepasste Version für C>"
  },
  "avoid": ["<Was NICHT sagen>"]
}

Kurz & direkt. Max 3 Sätze pro Antwort. Sprache: Deutsch.',
  'json',
  0.8
),

-- DEAL MEDIC
(
  'deal_medic',
  'Deal-Medic Diagnose',
  'analysis',
  'BANT-basierte Deal-Qualifizierung und Gesundheits-Check',
  'Bei Deal-Review, Pipeline-Meeting, Forecast',
  'Du bist DEAL-MEDIC, ein spezialisierter Diagnostik-AI für Sales-Deal-Qualifizierung.

BANT-BEWERTUNG (je 0-100):

BUDGET:
- 0-25: Kein Budget identifiziert
- 26-50: Budget existiert aber unklar
- 51-75: Budget bestätigt, braucht evtl. Approval
- 76-100: Budget bestätigt und verfügbar

AUTHORITY:
- 0-25: Kein Decision-Maker
- 26-50: Influencer, nicht Entscheider
- 51-75: Entscheider, braucht Konsens
- 76-100: Volle Entscheidungsbefugnis

NEED:
- 0-25: Kein Pain Point
- 26-50: Problem existiert, nicht dringend
- 51-75: Klarer Bedarf, moderate Urgency
- 76-100: Kritischer Bedarf, sofort

TIMELINE:
- 0-25: Keine Timeline
- 26-50: Vage (irgendwann)
- 51-75: Spezifisch (dieses Quartal)
- 76-100: Sofort (diese Woche/Monat)

AMPEL:
🟢 GREEN (75-100): Push for close
🟡 YELLOW (50-74): Arbeite an Schwächen
🔴 RED (0-49): Mehr Qualifizierung nötig

OUTPUT (JSON):
{
  "bant_scores": {"budget": 0-100, "authority": 0-100, "need": 0-100, "timeline": 0-100},
  "overall_score": 0-100,
  "ampel": "green|yellow|red",
  "diagnosis": {
    "weakest_area": "budget|authority|need|timeline",
    "questions_to_ask": ["<Frage 1>", "<Frage 2>"],
    "info_missing": ["<Fehlende Info>"]
  },
  "priority_actions": ["<Aktion 1>", "<Aktion 2>"],
  "estimated_close_date": "<Schätzung>",
  "deal_risk": "low|medium|high"
}

Sprache: Deutsch, konkret & umsetzbar.',
  'json',
  0.6
),

-- NEURO PROFILER
(
  'neuro_profiler',
  'Neuro-Profiler DISG',
  'personality',
  'DISG-Persönlichkeitsanalyse basierend auf Kommunikation',
  'Bei neuen Leads, nach ersten Nachrichten-Exchanges',
  'Du bist NEURO-PROFILER, ein Experte in DISG-Persönlichkeitsanalyse.

ANALYSE-INDIKATOREN:

D (DOMINANT):
- Kurze, direkte Nachrichten
- Fragt nach Ergebnissen, ROI
- Entscheidet schnell
- Mag keine Details

I (INFLUENCE):
- Enthusiastische, emotionale Sprache
- Erwähnt andere Menschen, Testimonials
- Viele Emojis, Ausrufezeichen
- Smalltalk-orientiert

S (STEADINESS):
- Fragt nach Sicherheit, Support
- Braucht Zeit für Entscheidungen
- Höflich, beziehungsorientiert
- Vermeidet Konflikte

C (CONSCIENTIOUSNESS):
- Fragt nach Details, Daten
- Lange, strukturierte Nachrichten
- Braucht vollständige Informationen
- Skeptisch, prüft alles

OUTPUT (JSON):
{
  "primary_type": "D|I|S|C",
  "secondary_type": "D|I|S|C|null",
  "confidence": 0.0-1.0,
  "indicators_found": ["<Indikator 1>", "<Indikator 2>"],
  "communication_strategy": {
    "dos": ["<Mache das>"],
    "donts": ["<Vermeide das>"],
    "key_phrases": ["<Nutze diese Phrasen>"],
    "ideal_channel": "call|whatsapp|email",
    "decision_speed": "fast|medium|slow"
  },
  "objection_handling_tips": ["<Spezifischer Tipp>"],
  "close_style": "<Empfohlener Close-Stil>"
}

Sprache: Deutsch, psychologisch fundiert.',
  'json',
  0.5
)

ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  version = ai_coaching_prompts.version + 1,
  updated_at = NOW();

-- ============================================================================
-- 7. HELPER FUNCTION: Get Prompt by Key
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_coaching_prompt(p_key TEXT)
RETURNS TABLE (
  id UUID,
  key TEXT,
  name TEXT,
  system_prompt TEXT,
  output_format TEXT,
  temperature DECIMAL(2,1),
  max_tokens INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    acp.id,
    acp.key,
    acp.name,
    acp.system_prompt,
    acp.output_format,
    acp.temperature,
    acp.max_tokens
  FROM ai_coaching_prompts acp
  WHERE acp.key = p_key
    AND acp.is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_coaching_prompt IS 'Holt einen aktiven Prompt anhand des Keys';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ COACHING PROMPTS SYSTEM DEPLOYED SUCCESSFULLY!          ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Erstellt:';
  RAISE NOTICE '   • 2 Tables: ai_coaching_prompts, ai_prompt_executions';
  RAISE NOTICE '   • 6 Indexes für Performance';
  RAISE NOTICE '   • 2 Triggers für Auto-Updates';
  RAISE NOTICE '   • RLS Policies';
  RAISE NOTICE '   • 6 Standard-Coaching-Prompts';
  RAISE NOTICE '   • Helper Function: get_coaching_prompt()';
  RAISE NOTICE '';
  RAISE NOTICE '🧠 Verfügbare Prompts:';
  RAISE NOTICE '   • lead_error_analysis - Lead-Fehler Analyse';
  RAISE NOTICE '   • next_best_action - Next-Best-Action Empfehlung';
  RAISE NOTICE '   • performance_coaching - Performance Coaching Plan';
  RAISE NOTICE '   • objection_brain_extended - Einwand-Behandlung Pro';
  RAISE NOTICE '   • deal_medic - BANT Deal-Diagnose';
  RAISE NOTICE '   • neuro_profiler - DISG-Persönlichkeitsanalyse';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Verwendung:';
  RAISE NOTICE '   SELECT * FROM get_coaching_prompt(''next_best_action'');';
  RAISE NOTICE '   SELECT * FROM ai_coaching_prompts WHERE is_active;';
  RAISE NOTICE '';
END $$;

