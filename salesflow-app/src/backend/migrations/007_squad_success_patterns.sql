-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - SQUAD SUCCESS PATTERNS (ANGEPASST)                        ║
-- ║  Basierend auf tatsächlicher Datenbankstruktur                             ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════════
-- RPC FUNCTION: Get Success Patterns for Team (vereinfacht)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_squad_success_patterns(
  p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', u.id,
      'email', au.email,
      'full_name', COALESCE(au.raw_user_meta_data->>'full_name', au.email),
      'leads_created', COALESCE(lead_counts.total_leads, 0),
      'first_messages', COALESCE(lead_counts.contacted_leads, 0),
      'replies', COALESCE(lead_counts.qualified_leads, 0),
      'signups', COALESCE(lead_counts.won_leads, 0),
      'reply_rate_percent', ROUND(
        CASE 
          WHEN COALESCE(lead_counts.contacted_leads, 0) > 0 
          THEN (COALESCE(lead_counts.qualified_leads, 0)::NUMERIC / lead_counts.contacted_leads * 100)
          ELSE 0 
        END, 2
      ),
      'conversion_rate_percent', ROUND(
        CASE 
          WHEN COALESCE(lead_counts.total_leads, 0) > 0 
          THEN (COALESCE(lead_counts.won_leads, 0)::NUMERIC / lead_counts.total_leads * 100)
          ELSE 0 
        END, 2
      ),
      'overdue_count', COALESCE(task_counts.overdue_tasks, 0),
      'avg_completion_hours', COALESCE(task_counts.avg_hours, 0),
      'success_pattern', 
        CASE 
          WHEN COALESCE(lead_counts.qualified_leads, 0)::NUMERIC / NULLIF(lead_counts.contacted_leads, 0) * 100 >= 25 
            AND COALESCE(lead_counts.won_leads, 0)::NUMERIC / NULLIF(lead_counts.total_leads, 0) * 100 >= 15 
          THEN 'elite_performer'
          WHEN COALESCE(lead_counts.qualified_leads, 0)::NUMERIC / NULLIF(lead_counts.contacted_leads, 0) * 100 >= 25 
          THEN 'script_master'
          WHEN COALESCE(lead_counts.won_leads, 0)::NUMERIC / NULLIF(lead_counts.total_leads, 0) * 100 >= 15 
          THEN 'closing_expert'
          WHEN COALESCE(task_counts.overdue_tasks, 0) <= 2 
          THEN 'timing_champion'
          ELSE 'solid_performer'
        END,
      'success_score', LEAST(100, GREATEST(0,
        COALESCE(lead_counts.qualified_leads, 0)::NUMERIC / NULLIF(lead_counts.contacted_leads, 0) * 100 * 0.4 +
        COALESCE(lead_counts.won_leads, 0)::NUMERIC / NULLIF(lead_counts.total_leads, 0) * 100 * 0.4 +
        CASE WHEN COALESCE(task_counts.overdue_tasks, 0) = 0 THEN 20 ELSE GREATEST(0, 20 - task_counts.overdue_tasks * 3) END
      )),
      'strengths', ARRAY_REMOVE(ARRAY[
        CASE WHEN COALESCE(lead_counts.qualified_leads, 0)::NUMERIC / NULLIF(lead_counts.contacted_leads, 0) * 100 >= 25 
          THEN 'Exzellente Scripts & Ansprache' END,
        CASE WHEN COALESCE(lead_counts.won_leads, 0)::NUMERIC / NULLIF(lead_counts.total_leads, 0) * 100 >= 15 
          THEN 'Starke Closing-Skills' END,
        CASE WHEN COALESCE(task_counts.overdue_tasks, 0) <= 2 
          THEN 'Perfekte Follow-up-Disziplin' END
      ], NULL),
      'can_mentor_in', ARRAY_REMOVE(ARRAY[
        CASE WHEN COALESCE(lead_counts.qualified_leads, 0)::NUMERIC / NULLIF(lead_counts.contacted_leads, 0) * 100 >= 25 
          THEN 'script_optimization' END,
        CASE WHEN COALESCE(lead_counts.won_leads, 0)::NUMERIC / NULLIF(lead_counts.total_leads, 0) * 100 >= 15 
          THEN 'closing_techniques' END,
        CASE WHEN COALESCE(task_counts.overdue_tasks, 0) <= 2 
          THEN 'time_management' END
      ], NULL),
      'recommendations', jsonb_build_object(
        'share_scripts', COALESCE(lead_counts.qualified_leads, 0)::NUMERIC / NULLIF(lead_counts.contacted_leads, 0) * 100 >= 25,
        'closing_mentor', COALESCE(lead_counts.won_leads, 0)::NUMERIC / NULLIF(lead_counts.total_leads, 0) * 100 >= 15,
        'timing_coach', COALESCE(task_counts.overdue_tasks, 0) <= 2,
        'best_practice_doc', true
      )
    )
    ORDER BY COALESCE(lead_counts.won_leads, 0) DESC
  )
  INTO result
  FROM public.users u
  JOIN auth.users au ON u.id = au.id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE status IN ('contacted', 'qualified', 'proposal_sent', 'won', 'lost')) as contacted_leads,
      COUNT(*) FILTER (WHERE status IN ('qualified', 'proposal_sent', 'won')) as qualified_leads,
      COUNT(*) FILTER (WHERE status = 'won') as won_leads
    FROM public.leads
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
  ) lead_counts ON lead_counts.user_id = u.id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE completed = FALSE AND due_date < CURRENT_DATE) as overdue_tasks,
      COALESCE(AVG(
        CASE WHEN completed = TRUE AND completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (completed_at - created_at))/3600 
        END
      ), 0) as avg_hours
    FROM public.follow_up_tasks
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
  ) task_counts ON task_counts.user_id = u.id
  WHERE (p_workspace_id IS NULL OR u.team_id = p_workspace_id)
    AND COALESCE(lead_counts.total_leads, 0) >= 1;  -- Mindestens 1 Lead
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPC FUNCTION: Get Top Mentors
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_top_mentors(
  p_workspace_id UUID DEFAULT NULL,
  p_mentor_area TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS JSONB AS $$
BEGIN
  RETURN public.get_squad_success_patterns(p_workspace_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPC FUNCTION: Get Pattern Summary
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_pattern_summary(
  p_workspace_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  patterns JSONB;
  result JSONB;
BEGIN
  patterns := public.get_squad_success_patterns(p_workspace_id);
  
  SELECT jsonb_build_object(
    'total_performers', jsonb_array_length(patterns),
    'elite_performers', (SELECT COUNT(*) FROM jsonb_array_elements(patterns) p WHERE p->>'success_pattern' = 'elite_performer'),
    'script_masters', (SELECT COUNT(*) FROM jsonb_array_elements(patterns) p WHERE p->>'success_pattern' = 'script_master'),
    'closing_experts', (SELECT COUNT(*) FROM jsonb_array_elements(patterns) p WHERE p->>'success_pattern' = 'closing_expert'),
    'timing_champions', (SELECT COUNT(*) FROM jsonb_array_elements(patterns) p WHERE p->>'success_pattern' = 'timing_champion'),
    'solid_performers', (SELECT COUNT(*) FROM jsonb_array_elements(patterns) p WHERE p->>'success_pattern' = 'solid_performer'),
    'avg_team_score', COALESCE((SELECT ROUND(AVG((p->>'success_score')::NUMERIC), 1) FROM jsonb_array_elements(patterns) p), 0),
    'top_performer', patterns->0,
    'available_mentors', jsonb_build_object(
      'script_optimization', (SELECT COUNT(*) FROM jsonb_array_elements(patterns) p WHERE p->'can_mentor_in' ? 'script_optimization'),
      'closing_techniques', (SELECT COUNT(*) FROM jsonb_array_elements(patterns) p WHERE p->'can_mentor_in' ? 'closing_techniques'),
      'time_management', (SELECT COUNT(*) FROM jsonb_array_elements(patterns) p WHERE p->'can_mentor_in' ? 'time_management')
    )
  ) INTO result;
  
  RETURN COALESCE(result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.get_squad_success_patterns(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_mentors(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pattern_summary(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- SUCCESS
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ SQUAD SUCCESS PATTERNS RPC FUNKTIONEN ERSTELLT!          ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Funktionen:';
  RAISE NOTICE '   • get_squad_success_patterns(workspace_id)';
  RAISE NOTICE '   • get_top_mentors(workspace_id, area, limit)';
  RAISE NOTICE '   • get_pattern_summary(workspace_id)';
  RAISE NOTICE '';
END $$;
