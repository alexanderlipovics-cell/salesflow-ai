-- ====================================================================
-- SPEED-HUNTER LOOP - DATABASE SCHEMA
-- ====================================================================
-- High-Velocity Lead Processing (Tinder for CRM)
-- ====================================================================

-- ====================================================================
-- SPEED HUNTER SESSIONS TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS speed_hunter_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- User
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Session Config
  daily_goal INT DEFAULT 20,
  focus_mode BOOLEAN DEFAULT true, -- Full-screen mode
  
  -- Progress
  tasks_completed INT DEFAULT 0,
  tasks_skipped INT DEFAULT 0,
  tasks_snoozed INT DEFAULT 0,
  
  -- Gamification
  streak_count INT DEFAULT 0, -- Consecutive completions without break
  combo_multiplier DECIMAL(3,2) DEFAULT 1.00, -- Bonus for streaks
  total_points INT DEFAULT 0,
  
  -- Performance Metrics
  avg_time_per_task_seconds INT,
  tasks_per_minute DECIMAL(5,2),
  
  -- Session Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'completed', 'abandoned'
  
  -- Timestamps
  last_action_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_speed_sessions_user_active ON speed_hunter_sessions(user_id, status) 
  WHERE status = 'active';
CREATE INDEX idx_speed_sessions_created ON speed_hunter_sessions(created_at DESC);

-- ====================================================================
-- SPEED HUNTER ACTIONS TABLE (Event Log)
-- ====================================================================

CREATE TABLE IF NOT EXISTS speed_hunter_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Session & Lead
  session_id UUID NOT NULL REFERENCES speed_hunter_sessions(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Action Details
  action_type VARCHAR(20) NOT NULL, -- 'completed', 'snoozed', 'skipped', 'called', 'messaged'
  outcome VARCHAR(50), -- 'sent_message', 'scheduled_call', 'not_interested', etc.
  
  -- Timing
  time_spent_seconds INT,
  
  -- Notes
  quick_note TEXT,
  
  -- Points (for gamification)
  points_earned INT DEFAULT 0
);

CREATE INDEX idx_speed_actions_session ON speed_hunter_actions(session_id, created_at DESC);
CREATE INDEX idx_speed_actions_lead ON speed_hunter_actions(lead_id);

-- ====================================================================
-- RPC: GET SPEED QUEUE (High Performance)
-- ====================================================================

CREATE OR REPLACE FUNCTION get_speed_queue(
  p_user_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  lead_id UUID,
  lead_name TEXT,
  lead_status VARCHAR(20),
  lead_score INT,
  next_follow_up TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,
  phone VARCHAR(50),
  instagram_handle VARCHAR(100),
  company_name VARCHAR(255),
  priority_rank INT,
  total_contacts INT,
  response_rate DECIMAL(5,4)
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Use provided user_id or get from auth
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  WITH prioritized_leads AS (
    SELECT 
      l.id,
      CONCAT(l.first_name, ' ', COALESCE(l.last_name, '')) as name,
      l.status::VARCHAR(20),
      COALESCE(l.lead_score, 0) as score,
      l.next_follow_up,
      l.last_contact_date,
      l.phone,
      l.instagram_handle,
      mc.name as company,
      l.total_contacts,
      l.response_rate,
      
      -- Priority Calculation
      CASE
        -- Highest priority: Overdue hot leads
        WHEN l.status IN ('hot', 'warm') 
          AND l.next_follow_up <= NOW() 
          THEN 1
        
        -- High priority: New leads
        WHEN l.status = 'cold' 
          AND l.total_contacts = 0 
          THEN 2
        
        -- Medium priority: Due follow-ups
        WHEN l.next_follow_up <= NOW() 
          THEN 3
        
        -- Lower priority: Not due yet but high score
        WHEN COALESCE(l.lead_score, 0) > 70 
          THEN 4
        
        -- Lowest priority: Everything else
        ELSE 5
      END as priority
      
    FROM leads l
    LEFT JOIN mlm_companies mc ON l.company_id = mc.id
    WHERE l.user_id = v_user_id
      AND l.is_blocked = false
      AND l.unsubscribed = false
      AND l.status NOT IN ('lost', 'customer', 'partner') -- Exclude closed statuses
    ORDER BY 
      priority ASC,
      l.next_follow_up ASC NULLS LAST,
      l.lead_score DESC NULLS LAST,
      l.created_at DESC
    LIMIT p_limit
  )
  SELECT 
    pl.id,
    pl.name,
    pl.status,
    pl.score,
    pl.next_follow_up,
    pl.last_contact_date,
    pl.phone,
    pl.instagram_handle,
    pl.company,
    pl.priority,
    pl.total_contacts,
    pl.response_rate
  FROM prioritized_leads pl;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- RPC: START SPEED SESSION
-- ====================================================================

CREATE OR REPLACE FUNCTION start_speed_session(
  p_daily_goal INT DEFAULT 20,
  p_focus_mode BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Check if there's an active session
  SELECT id INTO v_session_id
  FROM speed_hunter_sessions
  WHERE user_id = v_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If active session exists, return it
  IF v_session_id IS NOT NULL THEN
    RETURN v_session_id;
  END IF;
  
  -- Create new session
  INSERT INTO speed_hunter_sessions (
    user_id,
    daily_goal,
    focus_mode,
    status
  ) VALUES (
    v_user_id,
    p_daily_goal,
    p_focus_mode,
    'active'
  ) RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- RPC: LOG SPEED ACTION
-- ====================================================================

CREATE OR REPLACE FUNCTION log_speed_action(
  p_session_id UUID,
  p_lead_id UUID,
  p_action_type VARCHAR(20),
  p_outcome VARCHAR(50) DEFAULT NULL,
  p_time_spent_seconds INT DEFAULT NULL,
  p_quick_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_session RECORD;
  v_points INT := 0;
  v_new_streak INT;
  v_result JSONB;
BEGIN
  -- Calculate points based on action
  v_points := CASE p_action_type
    WHEN 'completed' THEN 10
    WHEN 'messaged' THEN 15
    WHEN 'called' THEN 20
    WHEN 'snoozed' THEN 5
    WHEN 'skipped' THEN 0
    ELSE 0
  END;
  
  -- Log action
  INSERT INTO speed_hunter_actions (
    session_id,
    lead_id,
    action_type,
    outcome,
    time_spent_seconds,
    quick_note,
    points_earned
  ) VALUES (
    p_session_id,
    p_lead_id,
    p_action_type,
    p_outcome,
    p_time_spent_seconds,
    p_quick_note,
    v_points
  );
  
  -- Update session stats
  SELECT * INTO v_session
  FROM speed_hunter_sessions
  WHERE id = p_session_id;
  
  -- Calculate new streak
  IF p_action_type IN ('completed', 'messaged', 'called') THEN
    v_new_streak := v_session.streak_count + 1;
  ELSE
    v_new_streak := 0; -- Break streak on skip/snooze
  END IF;
  
  UPDATE speed_hunter_sessions
  SET
    tasks_completed = tasks_completed + CASE WHEN p_action_type = 'completed' THEN 1 ELSE 0 END,
    tasks_skipped = tasks_skipped + CASE WHEN p_action_type = 'skipped' THEN 1 ELSE 0 END,
    tasks_snoozed = tasks_snoozed + CASE WHEN p_action_type = 'snoozed' THEN 1 ELSE 0 END,
    streak_count = v_new_streak,
    combo_multiplier = 1.0 + (v_new_streak::DECIMAL * 0.1), -- +10% per streak
    total_points = total_points + (v_points * (1.0 + (v_new_streak::DECIMAL * 0.1)))::INT,
    last_action_at = NOW()
  WHERE id = p_session_id
  RETURNING 
    jsonb_build_object(
      'session_id', id,
      'tasks_completed', tasks_completed,
      'streak_count', streak_count,
      'total_points', total_points,
      'combo_multiplier', combo_multiplier
    ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- RPC: END SPEED SESSION
-- ====================================================================

CREATE OR REPLACE FUNCTION end_speed_session(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_session RECORD;
  v_duration_seconds INT;
BEGIN
  SELECT 
    *,
    EXTRACT(EPOCH FROM (NOW() - created_at))::INT as duration
  INTO v_session
  FROM speed_hunter_sessions
  WHERE id = p_session_id;
  
  -- Calculate performance metrics
  UPDATE speed_hunter_sessions
  SET
    ended_at = NOW(),
    status = 'completed',
    avg_time_per_task_seconds = CASE 
      WHEN tasks_completed > 0 THEN v_session.duration / tasks_completed
      ELSE NULL
    END,
    tasks_per_minute = CASE
      WHEN v_session.duration > 0 THEN (tasks_completed::DECIMAL / (v_session.duration / 60.0))
      ELSE 0
    END
  WHERE id = p_session_id
  RETURNING 
    jsonb_build_object(
      'session_id', id,
      'duration_seconds', EXTRACT(EPOCH FROM (ended_at - created_at))::INT,
      'tasks_completed', tasks_completed,
      'streak_max', streak_count,
      'total_points', total_points,
      'tasks_per_minute', tasks_per_minute
    ) INTO v_session;
  
  RETURN to_jsonb(v_session);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- RLS POLICIES
-- ====================================================================

ALTER TABLE speed_hunter_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_hunter_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON speed_hunter_sessions FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own actions"
  ON speed_hunter_actions FOR SELECT
  USING (session_id IN (
    SELECT id FROM speed_hunter_sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own actions"
  ON speed_hunter_actions FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM speed_hunter_sessions WHERE user_id = auth.uid()
  ));

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================

-- Test 1: Get speed queue
-- SELECT * FROM get_speed_queue(auth.uid(), 20);

-- Test 2: Start session
-- SELECT start_speed_session(20, true);

-- Test 3: Log action
-- SELECT log_speed_action(
--   'session-uuid',
--   'lead-uuid',
--   'completed',
--   'sent_message',
--   30,
--   'Sent cold intro template'
-- );

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ SPEED-HUNTER LOOP DATABASE SCHEMA INSTALLED!';
  RAISE NOTICE '✅ speed_hunter_sessions table created';
  RAISE NOTICE '✅ speed_hunter_actions table created';
  RAISE NOTICE '✅ 4 RPC functions created';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Ready for high-velocity lead processing!';
  RAISE NOTICE '';
END $$;
