-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - OBJECTION BRAIN & LEAD SCORING                            ║
-- ║  RPC-Funktionen für Einwand-Handling und automatische Lead-Bewertung       ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Version: 008
-- Features:
--   • Objection Brain: Fuzzy-Suche, DISG-Antworten, Kategorie-Filter
--   • Lead Scoring: BANT-Score, Auto-Berechnung, Score-History
--
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: OBJECTION BRAIN RPC FUNKTIONEN
-- ═══════════════════════════════════════════════════════════════════════════

-- 1.1 Fuzzy-Suche nach Einwänden
CREATE OR REPLACE FUNCTION public.search_objections(
  p_search_text TEXT,
  p_category TEXT DEFAULT NULL,
  p_vertical TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(obj_data)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'objection_text', objection_text,
      'category', objection_category,
      'severity', severity,
      'responses', jsonb_build_object(
        'logical', response_logical,
        'emotional', response_emotional,
        'provocative', response_provocative
      ),
      'disg_responses', jsonb_build_object(
        'd', response_for_d,
        'i', response_for_i,
        's', response_for_s,
        'g', response_for_g
      ),
      'follow_up_question', follow_up_question,
      'bridge_to_close', bridge_to_close,
      'success_rate', success_rate,
      'times_used', times_used,
      'vertical', vertical,
      'similarity_score', similarity(LOWER(objection_text), LOWER(p_search_text))
    ) as obj_data
    FROM public.objection_library
    WHERE is_active = true
      AND (p_category IS NULL OR objection_category = p_category)
      AND (p_vertical IS NULL OR vertical IN (p_vertical, 'all'))
      AND (
        objection_text ILIKE '%' || p_search_text || '%'
        OR similarity(LOWER(objection_text), LOWER(p_search_text)) > 0.2
      )
    ORDER BY 
      CASE WHEN objection_text ILIKE '%' || p_search_text || '%' THEN 0 ELSE 1 END,
      similarity(LOWER(objection_text), LOWER(p_search_text)) DESC,
      success_rate DESC
    LIMIT p_limit
  ) sub;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.2 Einwand nach Kategorie abrufen
CREATE OR REPLACE FUNCTION public.get_objections_by_category(
  p_category TEXT,
  p_vertical TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'objection_text', objection_text,
      'category', objection_category,
      'severity', severity,
      'response_logical', response_logical,
      'response_emotional', response_emotional,
      'response_provocative', response_provocative,
      'success_rate', success_rate
    )
    ORDER BY severity DESC, success_rate DESC
  )
  INTO result
  FROM public.objection_library
  WHERE is_active = true
    AND objection_category = p_category
    AND (p_vertical IS NULL OR vertical IN (p_vertical, 'all'));
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.3 DISG-spezifische Antwort abrufen
CREATE OR REPLACE FUNCTION public.get_disg_response(
  p_objection_id UUID,
  p_disg_type TEXT  -- 'd', 'i', 's', oder 'g'
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  response_text TEXT;
BEGIN
  SELECT 
    CASE p_disg_type
      WHEN 'd' THEN response_for_d
      WHEN 'i' THEN response_for_i
      WHEN 's' THEN response_for_s
      WHEN 'g' THEN response_for_g
      ELSE response_logical
    END,
    jsonb_build_object(
      'objection_id', id,
      'objection_text', objection_text,
      'disg_type', p_disg_type,
      'response', CASE p_disg_type
        WHEN 'd' THEN response_for_d
        WHEN 'i' THEN response_for_i
        WHEN 's' THEN response_for_s
        WHEN 'g' THEN response_for_g
        ELSE response_logical
      END,
      'follow_up_question', follow_up_question,
      'bridge_to_close', bridge_to_close
    )
  INTO response_text, result
  FROM public.objection_library
  WHERE id = p_objection_id AND is_active = true;
  
  -- Track usage
  UPDATE public.objection_library 
  SET times_used = times_used + 1 
  WHERE id = p_objection_id;
  
  RETURN COALESCE(result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.4 Alle Kategorien abrufen
CREATE OR REPLACE FUNCTION public.get_objection_categories()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(DISTINCT jsonb_build_object(
      'category', objection_category,
      'count', category_count,
      'emoji', CASE objection_category
        WHEN 'price' THEN '💰'
        WHEN 'time' THEN '⏰'
        WHEN 'trust' THEN '🤝'
        WHEN 'need' THEN '🤔'
        WHEN 'authority' THEN '👔'
        WHEN 'stall' THEN '⏸️'
        WHEN 'competition' THEN '🏆'
        WHEN 'mlm_stigma' THEN '🚫'
        WHEN 'limiting_belief' THEN '🧠'
        ELSE '💬'
      END
    ))
    FROM (
      SELECT objection_category, COUNT(*) as category_count
      FROM public.objection_library
      WHERE is_active = true
      GROUP BY objection_category
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.5 Top-Einwände (meistgenutzt)
CREATE OR REPLACE FUNCTION public.get_top_objections(
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'objection_text', objection_text,
        'category', objection_category,
        'times_used', times_used,
        'success_rate', success_rate
      )
    )
    FROM (
      SELECT * FROM public.objection_library
      WHERE is_active = true
      ORDER BY times_used DESC, success_rate DESC
      LIMIT p_limit
    ) sub
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: LEAD SCORING SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- 2.1 BANT Score Spalten zur Leads-Tabelle hinzufügen (falls nicht vorhanden)
DO $$
BEGIN
  -- BANT Scores
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'bant_budget') THEN
    ALTER TABLE public.leads ADD COLUMN bant_budget INTEGER DEFAULT 0 CHECK (bant_budget BETWEEN 0 AND 25);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'bant_authority') THEN
    ALTER TABLE public.leads ADD COLUMN bant_authority INTEGER DEFAULT 0 CHECK (bant_authority BETWEEN 0 AND 25);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'bant_need') THEN
    ALTER TABLE public.leads ADD COLUMN bant_need INTEGER DEFAULT 0 CHECK (bant_need BETWEEN 0 AND 25);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'bant_timeline') THEN
    ALTER TABLE public.leads ADD COLUMN bant_timeline INTEGER DEFAULT 0 CHECK (bant_timeline BETWEEN 0 AND 25);
  END IF;
  
  -- Gesamt-Score (automatisch berechnet)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'lead_score') THEN
    ALTER TABLE public.leads ADD COLUMN lead_score INTEGER DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100);
  END IF;
  
  -- Score-Kategorie
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'score_category') THEN
    ALTER TABLE public.leads ADD COLUMN score_category TEXT DEFAULT 'cold' 
      CHECK (score_category IN ('hot', 'warm', 'cool', 'cold'));
  END IF;
  
  -- DISG Persönlichkeitstyp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'disg_type') THEN
    ALTER TABLE public.leads ADD COLUMN disg_type TEXT CHECK (disg_type IN ('d', 'i', 's', 'g'));
  END IF;
  
  -- Letzter Score-Update
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'score_updated_at') THEN
    ALTER TABLE public.leads ADD COLUMN score_updated_at TIMESTAMPTZ;
  END IF;

  RAISE NOTICE '✅ BANT Score Spalten hinzugefügt';
END $$;

-- 2.2 Lead Score berechnen
CREATE OR REPLACE FUNCTION public.calculate_lead_score(
  p_lead_id UUID
)
RETURNS JSONB AS $$
DECLARE
  lead_record RECORD;
  total_score INTEGER;
  category TEXT;
  result JSONB;
BEGIN
  -- Lead-Daten abrufen
  SELECT * INTO lead_record FROM public.leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lead nicht gefunden');
  END IF;
  
  -- BANT Score berechnen (jeweils max 25 Punkte)
  total_score := COALESCE(lead_record.bant_budget, 0) + 
                 COALESCE(lead_record.bant_authority, 0) + 
                 COALESCE(lead_record.bant_need, 0) + 
                 COALESCE(lead_record.bant_timeline, 0);
  
  -- Bonus für Status
  total_score := total_score + CASE lead_record.status
    WHEN 'won' THEN 0  -- Bereits gewonnen
    WHEN 'qualified' THEN 10
    WHEN 'proposal_sent' THEN 15
    WHEN 'contacted' THEN 5
    WHEN 'new' THEN 0
    ELSE 0
  END;
  
  -- Max 100
  total_score := LEAST(100, total_score);
  
  -- Kategorie bestimmen
  category := CASE
    WHEN total_score >= 75 THEN 'hot'
    WHEN total_score >= 50 THEN 'warm'
    WHEN total_score >= 25 THEN 'cool'
    ELSE 'cold'
  END;
  
  -- Lead aktualisieren
  UPDATE public.leads 
  SET 
    lead_score = total_score,
    score_category = category,
    score_updated_at = NOW()
  WHERE id = p_lead_id;
  
  result := jsonb_build_object(
    'lead_id', p_lead_id,
    'bant_scores', jsonb_build_object(
      'budget', COALESCE(lead_record.bant_budget, 0),
      'authority', COALESCE(lead_record.bant_authority, 0),
      'need', COALESCE(lead_record.bant_need, 0),
      'timeline', COALESCE(lead_record.bant_timeline, 0)
    ),
    'total_score', total_score,
    'category', category,
    'category_emoji', CASE category
      WHEN 'hot' THEN '🔥'
      WHEN 'warm' THEN '🌡️'
      WHEN 'cool' THEN '❄️'
      ELSE '🧊'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 BANT Score aktualisieren
CREATE OR REPLACE FUNCTION public.update_bant_score(
  p_lead_id UUID,
  p_budget INTEGER DEFAULT NULL,
  p_authority INTEGER DEFAULT NULL,
  p_need INTEGER DEFAULT NULL,
  p_timeline INTEGER DEFAULT NULL,
  p_disg_type TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  -- BANT-Werte aktualisieren (nur wenn angegeben)
  UPDATE public.leads
  SET
    bant_budget = COALESCE(p_budget, bant_budget),
    bant_authority = COALESCE(p_authority, bant_authority),
    bant_need = COALESCE(p_need, bant_need),
    bant_timeline = COALESCE(p_timeline, bant_timeline),
    disg_type = COALESCE(p_disg_type, disg_type)
  WHERE id = p_lead_id;
  
  -- Score neu berechnen und zurückgeben
  RETURN public.calculate_lead_score(p_lead_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.4 Leads nach Score abrufen
CREATE OR REPLACE FUNCTION public.get_leads_by_score(
  p_user_id UUID,
  p_category TEXT DEFAULT NULL,
  p_min_score INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'email', email,
        'phone', phone,
        'company', company,
        'status', status,
        'lead_score', COALESCE(lead_score, 0),
        'score_category', COALESCE(score_category, 'cold'),
        'bant', jsonb_build_object(
          'budget', COALESCE(bant_budget, 0),
          'authority', COALESCE(bant_authority, 0),
          'need', COALESCE(bant_need, 0),
          'timeline', COALESCE(bant_timeline, 0)
        ),
        'disg_type', disg_type,
        'created_at', created_at
      )
      ORDER BY COALESCE(lead_score, 0) DESC
    )
    FROM public.leads
    WHERE user_id = p_user_id
      AND (p_category IS NULL OR score_category = p_category)
      AND COALESCE(lead_score, 0) >= p_min_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.5 Score-Statistiken für Dashboard
CREATE OR REPLACE FUNCTION public.get_lead_score_stats(
  p_user_id UUID
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_leads', COUNT(*),
      'avg_score', ROUND(AVG(COALESCE(lead_score, 0))::NUMERIC, 1),
      'hot_leads', COUNT(*) FILTER (WHERE score_category = 'hot'),
      'warm_leads', COUNT(*) FILTER (WHERE score_category = 'warm'),
      'cool_leads', COUNT(*) FILTER (WHERE score_category = 'cool'),
      'cold_leads', COUNT(*) FILTER (WHERE score_category = 'cold' OR score_category IS NULL),
      'unscored_leads', COUNT(*) FILTER (WHERE lead_score IS NULL OR lead_score = 0),
      'top_lead', (
        SELECT jsonb_build_object(
          'id', id,
          'name', name,
          'score', lead_score
        )
        FROM public.leads
        WHERE user_id = p_user_id
        ORDER BY COALESCE(lead_score, 0) DESC
        LIMIT 1
      )
    )
    FROM public.leads
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.6 Auto-Score Trigger bei Lead-Update
CREATE OR REPLACE FUNCTION trigger_auto_calculate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Nur wenn BANT-Werte geändert wurden
  IF (NEW.bant_budget IS DISTINCT FROM OLD.bant_budget) OR
     (NEW.bant_authority IS DISTINCT FROM OLD.bant_authority) OR
     (NEW.bant_need IS DISTINCT FROM OLD.bant_need) OR
     (NEW.bant_timeline IS DISTINCT FROM OLD.bant_timeline) OR
     (NEW.status IS DISTINCT FROM OLD.status)
  THEN
    PERFORM public.calculate_lead_score(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger erstellen
DROP TRIGGER IF EXISTS trigger_lead_score_update ON public.leads;
CREATE TRIGGER trigger_lead_score_update
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_calculate_lead_score();

-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Objection Brain
GRANT EXECUTE ON FUNCTION public.search_objections(TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_objections_by_category(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_disg_response(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_objection_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_objections(INTEGER) TO authenticated;

-- Lead Scoring
GRANT EXECUTE ON FUNCTION public.calculate_lead_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_bant_score(UUID, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leads_by_score(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_score_stats(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- ENABLE pg_trgm FOR FUZZY SEARCH (falls nicht vorhanden)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index für Fuzzy-Suche
CREATE INDEX IF NOT EXISTS idx_objection_library_text_trgm 
  ON public.objection_library USING gin (objection_text gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ OBJECTION BRAIN & LEAD SCORING ERSTELLT!                 ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '🧠 OBJECTION BRAIN:';
  RAISE NOTICE '   • search_objections(text, category, vertical, limit)';
  RAISE NOTICE '   • get_objections_by_category(category, vertical)';
  RAISE NOTICE '   • get_disg_response(objection_id, disg_type)';
  RAISE NOTICE '   • get_objection_categories()';
  RAISE NOTICE '   • get_top_objections(limit)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 LEAD SCORING:';
  RAISE NOTICE '   • calculate_lead_score(lead_id)';
  RAISE NOTICE '   • update_bant_score(lead_id, b, a, n, t, disg)';
  RAISE NOTICE '   • get_leads_by_score(user_id, category, min_score)';
  RAISE NOTICE '   • get_lead_score_stats(user_id)';
  RAISE NOTICE '   • Auto-Trigger bei Lead-Updates';
  RAISE NOTICE '';
  RAISE NOTICE '📋 BANT-Score Spalten zur leads-Tabelle hinzugefügt';
  RAISE NOTICE '';
END $$;

