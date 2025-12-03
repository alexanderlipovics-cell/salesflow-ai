-- ╔════════════════════════════════════════════════════════════════╗
-- ║  AUTO-UPDATE TRIGGERS                                          ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. AUTO-UPDATE RESPONSE TIME
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.responded_at IS NOT NULL AND (OLD.responded_at IS NULL OR OLD.responded_at IS DISTINCT FROM NEW.responded_at) THEN
    NEW.response_time_hours := EXTRACT(EPOCH FROM (NEW.responded_at - NEW.sent_at))::INTEGER / 3600;
    NEW.was_successful := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_response_time ON message_tracking;
CREATE TRIGGER trigger_update_response_time
BEFORE UPDATE ON message_tracking
FOR EACH ROW
EXECUTE FUNCTION update_response_time();

COMMENT ON FUNCTION update_response_time IS 'Auto-calculates response_time_hours when responded_at is set';

-- ═══════════════════════════════════════════════════════════════
-- 2. AUTO-INCREMENT PLAYBOOK USAGE COUNT
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_playbook_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.playbook_id IS NOT NULL THEN
    UPDATE followup_playbooks
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = NEW.playbook_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_playbook_usage ON follow_ups;
CREATE TRIGGER trigger_increment_playbook_usage
AFTER INSERT ON follow_ups
FOR EACH ROW
EXECUTE FUNCTION increment_playbook_usage();

COMMENT ON FUNCTION increment_playbook_usage IS 'Auto-increments playbook usage_count when used';

-- ═══════════════════════════════════════════════════════════════
-- 3. AUTO-UPDATE PLAYBOOK SUCCESS RATE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_playbook_success_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_success_rate DECIMAL;
BEGIN
  IF NEW.playbook_id IS NOT NULL AND NEW.responded_at IS NOT NULL AND (OLD.responded_at IS NULL OR OLD.responded_at IS DISTINCT FROM NEW.responded_at) THEN
    -- Calculate success rate
    SELECT
      ROUND(
        100.0 * COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
        2
      )
    INTO v_success_rate
    FROM follow_ups
    WHERE playbook_id = NEW.playbook_id;
    
    -- Update playbook
    UPDATE followup_playbooks
    SET success_rate = v_success_rate,
        updated_at = NOW()
    WHERE id = NEW.playbook_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_playbook_success_rate ON follow_ups;
CREATE TRIGGER trigger_update_playbook_success_rate
AFTER UPDATE ON follow_ups
FOR EACH ROW
EXECUTE FUNCTION update_playbook_success_rate();

COMMENT ON FUNCTION update_playbook_success_rate IS 'Auto-updates playbook success_rate when follow-up gets a response';

-- ═══════════════════════════════════════════════════════════════
-- 4. AUTO-UPDATE USER UPDATED_AT
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to multiple tables
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_followup_templates_updated_at ON followup_templates;
CREATE TRIGGER trigger_followup_templates_updated_at
BEFORE UPDATE ON followup_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_ai_prompts_updated_at ON ai_prompts;
CREATE TRIGGER trigger_ai_prompts_updated_at
BEFORE UPDATE ON ai_prompts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column IS 'Auto-updates updated_at timestamp on row updates';

-- ═══════════════════════════════════════════════════════════════
-- 5. AUTO-INCREMENT TEMPLATE USAGE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Note: We'll track template_id in follow_ups via a custom field if needed
  -- For now, this is a placeholder for future expansion
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_template_usage IS 'Placeholder for template usage tracking';

-- ═══════════════════════════════════════════════════════════════
-- 6. AUTO-UPDATE USER STREAK
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_last_activity_date DATE;
  v_current_streak INTEGER;
BEGIN
  -- Get current user stats
  SELECT last_activity_date, streak_days
  INTO v_last_activity_date, v_current_streak
  FROM users
  WHERE id = NEW.user_id;
  
  -- Check if activity is today
  IF CURRENT_DATE > v_last_activity_date THEN
    -- Check if yesterday (continue streak) or reset
    IF CURRENT_DATE - v_last_activity_date = 1 THEN
      -- Continue streak
      UPDATE users
      SET streak_days = streak_days + 1,
          last_activity_date = CURRENT_DATE,
          updated_at = NOW()
      WHERE id = NEW.user_id;
    ELSE
      -- Reset streak
      UPDATE users
      SET streak_days = 1,
          last_activity_date = CURRENT_DATE,
          updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_streak_activities ON activities;
CREATE TRIGGER trigger_update_user_streak_activities
AFTER INSERT ON activities
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

DROP TRIGGER IF EXISTS trigger_update_user_streak_followups ON follow_ups;
CREATE TRIGGER trigger_update_user_streak_followups
AFTER INSERT ON follow_ups
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

COMMENT ON FUNCTION update_user_streak IS 'Auto-updates user activity streak when they perform actions';

-- ═══════════════════════════════════════════════════════════════
-- 7. AUTO-AWARD BADGES
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_badge_id UUID;
  v_requirement_met BOOLEAN;
  v_leads_won INTEGER;
  v_leads_created INTEGER;
  v_followups_sent INTEGER;
BEGIN
  -- Count user stats
  SELECT
    COUNT(CASE WHEN status = 'won' THEN 1 END),
    COUNT(*),
    (SELECT COUNT(*) FROM follow_ups WHERE user_id = NEW.user_id)
  INTO v_leads_won, v_leads_created, v_followups_sent
  FROM leads
  WHERE user_id = NEW.user_id;
  
  -- Check badges
  FOR v_badge_id IN
    SELECT b.id
    FROM badges b
    WHERE b.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM user_badges ub
        WHERE ub.user_id = NEW.user_id AND ub.badge_id = b.id
      )
  LOOP
    v_requirement_met := FALSE;
    
    -- Check requirements (simplified logic)
    SELECT
      CASE b.requirement_type
        WHEN 'deals_won' THEN v_leads_won >= b.requirement_value
        WHEN 'leads_created' THEN v_leads_created >= b.requirement_value
        WHEN 'followups_sent' THEN v_followups_sent >= b.requirement_value
        ELSE FALSE
      END
    INTO v_requirement_met
    FROM badges b
    WHERE b.id = v_badge_id;
    
    -- Award badge if requirement met
    IF v_requirement_met THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (NEW.user_id, v_badge_id)
      ON CONFLICT DO NOTHING;
      
      -- Add points to user
      UPDATE users
      SET points = points + (SELECT points FROM badges WHERE id = v_badge_id)
      WHERE id = NEW.user_id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_badges_leads ON leads;
CREATE TRIGGER trigger_check_badges_leads
AFTER INSERT OR UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION check_and_award_badges();

COMMENT ON FUNCTION check_and_award_badges IS 'Auto-checks and awards badges based on user achievements';

-- ═══════════════════════════════════════════════════════════════
-- 8. AUTO-INCREMENT AI PROMPT USAGE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_ai_prompt_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_prompts
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = NEW.prompt_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_ai_prompt_usage ON ai_prompt_executions;
CREATE TRIGGER trigger_increment_ai_prompt_usage
AFTER INSERT ON ai_prompt_executions
FOR EACH ROW
EXECUTE FUNCTION increment_ai_prompt_usage();

COMMENT ON FUNCTION increment_ai_prompt_usage IS 'Auto-increments AI prompt usage_count when executed';

-- ═══════════════════════════════════════════════════════════════
-- 9. AUTO-UPDATE AI PROMPT SUCCESS RATE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_ai_prompt_success_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_success_rate DECIMAL;
BEGIN
  IF NEW.user_rating IS NOT NULL THEN
    -- Calculate success rate based on ratings
    SELECT
      ROUND(AVG(user_rating) * 20, 2) -- Convert 1-5 rating to 0-100%
    INTO v_success_rate
    FROM ai_prompt_executions
    WHERE prompt_id = NEW.prompt_id
      AND user_rating IS NOT NULL;
    
    UPDATE ai_prompts
    SET success_rate = v_success_rate,
        updated_at = NOW()
    WHERE id = NEW.prompt_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ai_prompt_success_rate ON ai_prompt_executions;
CREATE TRIGGER trigger_update_ai_prompt_success_rate
AFTER UPDATE ON ai_prompt_executions
FOR EACH ROW
EXECUTE FUNCTION update_ai_prompt_success_rate();

COMMENT ON FUNCTION update_ai_prompt_success_rate IS 'Auto-updates AI prompt success_rate based on user ratings';

-- ═══════════════════════════════════════════════════════════════
-- 10. AUTO-CREATE TEMPLATE VERSION ON UPDATE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_template_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if actual template content changed
  IF OLD.body_template IS DISTINCT FROM NEW.body_template
     OR OLD.reminder_template IS DISTINCT FROM NEW.reminder_template
     OR OLD.fallback_template IS DISTINCT FROM NEW.fallback_template THEN
    
    INSERT INTO template_versions (
      template_id,
      version,
      name,
      body_template,
      reminder_template,
      fallback_template,
      created_by
    ) VALUES (
      NEW.id,
      NEW.version,
      OLD.name,
      OLD.body_template,
      OLD.reminder_template,
      OLD.fallback_template,
      NEW.created_by
    );
    
    -- Increment version
    NEW.version := NEW.version + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_template_version ON followup_templates;
CREATE TRIGGER trigger_create_template_version
BEFORE UPDATE ON followup_templates
FOR EACH ROW
EXECUTE FUNCTION create_template_version();

COMMENT ON FUNCTION create_template_version IS 'Auto-creates template version snapshot when template is updated';

-- ═══════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════

COMMENT ON SCHEMA public IS 'Sales Flow AI - Auto-Triggers installed:
1. update_response_time - Calculates response time
2. increment_playbook_usage - Tracks playbook usage
3. update_playbook_success_rate - Updates success rates
4. update_updated_at_column - Maintains updated_at timestamps
5. increment_template_usage - Tracks template usage
6. update_user_streak - Maintains user activity streaks
7. check_and_award_badges - Auto-awards gamification badges
8. increment_ai_prompt_usage - Tracks AI prompt usage
9. update_ai_prompt_success_rate - Updates AI success rates
10. create_template_version - Version control for templates';

