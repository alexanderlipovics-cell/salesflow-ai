-- Migration 20250106 - Full Text Search & Advanced Search Analytics
-- =====================================================================

-- Extensions -----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Search-ready columns on contacts ----------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS search_vector tsvector,
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_interactions INTEGER DEFAULT 0;

-- 2) Indexes -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS contacts_search_vector_idx
  ON public.contacts USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS contacts_full_name_trgm_idx
  ON public.contacts USING GIN (LOWER(full_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS contacts_email_trgm_idx
  ON public.contacts USING GIN (LOWER(email) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS contacts_company_trgm_idx
  ON public.contacts USING GIN (LOWER(company) gin_trgm_ops);

-- 3) Trigger to maintain search vectors --------------------------------
CREATE OR REPLACE FUNCTION update_contacts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.company, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_search_vector_trigger ON public.contacts;

CREATE TRIGGER contacts_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_search_vector();

-- 4) Backfill existing rows -------------------------------------------
UPDATE public.contacts
SET search_vector =
  setweight(to_tsvector('english', COALESCE(full_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(phone, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(company, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'D')
WHERE search_vector IS NULL;

-- 5) Advanced search function -----------------------------------------
CREATE OR REPLACE FUNCTION search_contacts(
  p_workspace_id UUID,
  p_query TEXT,
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_sort_by TEXT DEFAULT 'relevance',
  p_sort_order TEXT DEFAULT 'desc',
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT,
  lead_score INTEGER,
  rank REAL,
  headline TEXT,
  matched_fields TEXT[],
  total_count BIGINT
) AS $$
DECLARE
  v_page_size INTEGER := LEAST(GREATEST(p_page_size, 1), 100);
  v_offset INTEGER := GREATEST((p_page - 1) * LEAST(GREATEST(p_page_size, 1), 100), 0);
  v_sort_order TEXT := CASE WHEN LOWER(p_sort_order) = 'asc' THEN 'asc' ELSE 'desc' END;
  v_query TEXT := NULLIF(trim(p_query), '');
BEGIN
  RETURN QUERY
  WITH normalized AS (
    SELECT
      v_query AS query_text,
      CASE
        WHEN v_query IS NOT NULL THEN plainto_tsquery('english', v_query)
        ELSE NULL
      END AS ts_query
  ),
  filtered AS (
    SELECT
      c.id,
      c.full_name,
      c.email,
      c.phone,
      c.status::text AS status,
      c.lead_score,
      c.created_at,
      c.next_action_at,
      n.query_text,
      n.ts_query,
      CASE
        WHEN n.ts_query IS NOT NULL THEN ts_rank(c.search_vector, n.ts_query)
        ELSE 0
      END
      +
      CASE
        WHEN n.query_text IS NOT NULL THEN GREATEST(
          similarity(LOWER(COALESCE(c.full_name, '')), LOWER(n.query_text)),
          similarity(LOWER(COALESCE(c.email, '')), LOWER(n.query_text)),
          similarity(LOWER(COALESCE(c.company, '')), LOWER(n.query_text))
        )
        ELSE 0
      END * 0.5 AS overall_rank,
      CASE
        WHEN n.ts_query IS NOT NULL THEN ts_headline(
          'english',
          COALESCE(c.full_name, '') || ' ' || COALESCE(c.notes, ''),
          n.ts_query,
          'MaxWords=20, MinWords=15'
        )
        ELSE LEFT(COALESCE(c.notes, ''), 200)
      END AS snippet,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN n.ts_query IS NOT NULL AND to_tsvector('english', COALESCE(c.full_name, '')) @@ n.ts_query THEN 'full_name' END,
        CASE WHEN n.ts_query IS NOT NULL AND to_tsvector('english', COALESCE(c.email, '')) @@ n.ts_query THEN 'email' END,
        CASE WHEN n.ts_query IS NOT NULL AND to_tsvector('english', COALESCE(c.company, '')) @@ n.ts_query THEN 'company' END,
        CASE WHEN n.ts_query IS NOT NULL AND to_tsvector('english', COALESCE(c.notes, '')) @@ n.ts_query THEN 'notes' END
      ], NULL) AS matched_fields
    FROM public.contacts c
    CROSS JOIN normalized n
    WHERE c.workspace_id = p_workspace_id
      AND (
        n.ts_query IS NULL
        OR c.search_vector @@ n.ts_query
        OR (
          n.query_text IS NOT NULL AND (
            similarity(LOWER(COALESCE(c.full_name, '')), LOWER(n.query_text)) >= 0.35
            OR similarity(LOWER(COALESCE(c.email, '')), LOWER(n.query_text)) >= 0.35
            OR similarity(LOWER(COALESCE(c.company, '')), LOWER(n.query_text)) >= 0.35
          )
        )
      )
      AND (
        NOT (p_filters ? 'created_after')
        OR c.created_at >= (p_filters->>'created_after')::timestamptz
      )
      AND (
        NOT (p_filters ? 'created_before')
        OR c.created_at <= (p_filters->>'created_before')::timestamptz
      )
      AND (
        NOT (p_filters ? 'next_action_after')
        OR c.next_action_at >= (p_filters->>'next_action_after')::timestamptz
      )
      AND (
        NOT (p_filters ? 'next_action_before')
        OR c.next_action_at <= (p_filters->>'next_action_before')::timestamptz
      )
      AND (
        COALESCE(jsonb_array_length(COALESCE(p_filters->'statuses', '[]'::jsonb)), 0) = 0
        OR c.status::text = ANY(
          ARRAY(
            SELECT value
            FROM jsonb_array_elements_text(COALESCE(p_filters->'statuses', '[]'::jsonb)) AS status(value)
          )
        )
      )
      AND (
        COALESCE(jsonb_array_length(COALESCE(p_filters->'lifecycle_stages', '[]'::jsonb)), 0) = 0
        OR c.lifecycle_stage = ANY(
          ARRAY(
            SELECT value
            FROM jsonb_array_elements_text(COALESCE(p_filters->'lifecycle_stages', '[]'::jsonb)) AS stage(value)
          )
        )
      )
      AND (
        COALESCE(jsonb_array_length(COALESCE(p_filters->'lead_sources', '[]'::jsonb)), 0) = 0
        OR c.lead_source = ANY(
          ARRAY(
            SELECT value
            FROM jsonb_array_elements_text(COALESCE(p_filters->'lead_sources', '[]'::jsonb)) AS ls(value)
          )
        )
      )
      AND (
        NOT (p_filters ? 'lead_score_min')
        OR c.lead_score >= (p_filters->>'lead_score_min')::INTEGER
      )
      AND (
        NOT (p_filters ? 'lead_score_max')
        OR c.lead_score <= (p_filters->>'lead_score_max')::INTEGER
      )
      AND (
        NOT (p_filters ? 'last_contact_days')
        OR COALESCE(c.last_contact_at, to_timestamp(0)) <= NOW() - ((p_filters->>'last_contact_days')::INTEGER || ' days')::interval
      )
      AND (
        NOT (p_filters ? 'total_interactions_min')
        OR c.total_interactions >= (p_filters->>'total_interactions_min')::INTEGER
      )
      AND (
        COALESCE(jsonb_array_length(COALESCE(p_filters->'tags_all', '[]'::jsonb)), 0) = 0
        OR COALESCE(c.tags, ARRAY[]::text[]) @> COALESCE(
          ARRAY(
            SELECT value
            FROM jsonb_array_elements_text(COALESCE(p_filters->'tags_all', '[]'::jsonb)) AS tag(value)
          ),
          ARRAY[]::text[]
        )
      )
      AND (
        COALESCE(jsonb_array_length(COALESCE(p_filters->'tags_any', '[]'::jsonb)), 0) = 0
        OR COALESCE(c.tags, ARRAY[]::text[]) && COALESCE(
          ARRAY(
            SELECT value
            FROM jsonb_array_elements_text(COALESCE(p_filters->'tags_any', '[]'::jsonb)) AS tag(value)
          ),
          ARRAY[]::text[]
        )
      )
      AND (
        COALESCE(jsonb_array_length(COALESCE(p_filters->'tags_none', '[]'::jsonb)), 0) = 0
        OR NOT (
          COALESCE(c.tags, ARRAY[]::text[]) && COALESCE(
            ARRAY(
              SELECT value
              FROM jsonb_array_elements_text(COALESCE(p_filters->'tags_none', '[]'::jsonb)) AS tag(value)
            ),
            ARRAY[]::text[]
          )
        )
      )
      AND (
        COALESCE(jsonb_object_length(COALESCE(p_filters->'custom_fields', '{}'::jsonb)), 0) = 0
        OR c.custom_fields @> COALESCE(p_filters->'custom_fields', '{}'::jsonb)
      )
  )
  SELECT
    f.id,
    f.full_name,
    f.email,
    f.phone,
    f.status,
    f.lead_score,
    f.overall_rank::REAL AS rank,
    f.snippet AS headline,
    COALESCE(f.matched_fields, ARRAY[]::text[]) AS matched_fields,
    COUNT(*) OVER () AS total_count
  FROM filtered f
  ORDER BY
    (
      CASE LOWER(p_sort_by)
        WHEN 'lead_score' THEN COALESCE(f.lead_score, 0)::NUMERIC
        WHEN 'next_action' THEN EXTRACT(EPOCH FROM COALESCE(f.next_action_at, to_timestamp(0)))
        WHEN 'created_at' THEN EXTRACT(EPOCH FROM COALESCE(f.created_at, to_timestamp(0)))
        ELSE COALESCE(f.overall_rank, 0)::NUMERIC
      END
    ) * CASE WHEN v_sort_order = 'asc' THEN 1 ELSE -1 END DESC,
    f.overall_rank DESC,
    f.created_at DESC
  LIMIT v_page_size
  OFFSET v_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6) Search history table ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  clicked_result_id UUID,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS search_history_user_time_idx
  ON public.search_history (user_id, searched_at DESC);

CREATE INDEX IF NOT EXISTS search_history_workspace_time_idx
  ON public.search_history (workspace_id, searched_at DESC);

CREATE INDEX IF NOT EXISTS search_history_query_trgm_idx
  ON public.search_history USING GIN (query gin_trgm_ops);

-- 7) Saved searches table ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_by TEXT NOT NULL DEFAULT 'relevance',
  sort_order TEXT NOT NULL DEFAULT 'desc',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_searches_unique_name_idx
  ON public.saved_searches (workspace_id, user_id, LOWER(name));

CREATE INDEX IF NOT EXISTS saved_searches_workspace_idx
  ON public.saved_searches (workspace_id, user_id, created_at DESC);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_searches'
      AND policyname = 'saved_searches_owner_policy'
  ) THEN
    CREATE POLICY saved_searches_owner_policy
      ON public.saved_searches
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;


