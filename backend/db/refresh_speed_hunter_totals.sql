-- ============================================================================
-- RPC Function: refresh_speed_hunter_totals
-- ============================================================================
-- Für eine speed_hunter_session die Summen aus speed_hunter_actions 
-- neu berechnen und in der Session speichern – und die neuen Werte 
-- direkt zurückgeben (für new_totals im Endpoint).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_speed_hunter_totals(
  p_session_id uuid
)
RETURNS TABLE (
  total_contacts integer,
  total_points   integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Aggregiere alle Aktionen für die Session
  UPDATE public.speed_hunter_sessions s
  SET
    total_contacts = COALESCE(sub.cnt, 0),
    total_points   = COALESCE(sub.points, 0),
    updated_at     = NOW()
  FROM (
    SELECT
      session_id,
      COUNT(*)            AS cnt,
      COALESCE(SUM(points), 0) AS points
    FROM public.speed_hunter_actions
    WHERE session_id = p_session_id
    GROUP BY session_id
  ) sub
  WHERE s.id = sub.session_id;

  -- Falls noch keine Actions existieren, sicherstellen dass total_* auf 0 stehen
  UPDATE public.speed_hunter_sessions s
  SET
    total_contacts = COALESCE(total_contacts, 0),
    total_points   = COALESCE(total_points, 0),
    updated_at     = NOW()
  WHERE s.id = p_session_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.speed_hunter_actions a
      WHERE a.session_id = p_session_id
    );

  -- Neue Werte zurückgeben
  RETURN QUERY
  SELECT
    s.total_contacts,
    s.total_points
  FROM public.speed_hunter_sessions s
  WHERE s.id = p_session_id;
END;
$$;

-- Rechte vergeben (damit deine API-User das Ding aufrufen dürfen)
GRANT EXECUTE ON FUNCTION public.refresh_speed_hunter_totals(uuid)
  TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Function refresh_speed_hunter_totals created successfully!';
  RAISE NOTICE '📊 Returns: total_contacts, total_points';
  RAISE NOTICE '🔐 Security: DEFINER with authenticated access';
END $$;

