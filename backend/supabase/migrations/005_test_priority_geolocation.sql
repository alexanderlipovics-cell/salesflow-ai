-- ============================================================================
-- SALES FLOW AI - PRIORITY & GEOLOCATION TESTING
-- ============================================================================
-- Version: 2.0.0
-- Description: Test queries for priority scoring and geolocation system
-- ============================================================================

-- ============================================================================
-- PART 1: TEST DATA SETUP (Optional - for development)
-- ============================================================================

-- Create test contact with geolocation data
/*
INSERT INTO public.contacts (
  workspace_id,
  full_name,
  status,
  lead_score,
  contact_type,
  latitude,
  longitude,
  location_source,
  location_updated_at
) VALUES (
  'YOUR_WORKSPACE_ID',
  'Test Lead - Vienna',
  'interested',
  85,
  'prospect',
  48.2082,  -- Vienna latitude
  16.3738,  -- Vienna longitude
  'manual',
  now()
);
*/

-- ============================================================================
-- PART 2: VERIFICATION TESTS
-- ============================================================================

-- Test 1: Verify geolocation columns
SELECT 
  'Geolocation Columns Check' as test_name,
  COUNT(*) as column_count,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contacts'
  AND column_name IN ('latitude', 'longitude', 'location_source', 'location_accuracy', 'location_updated_at');

-- Test 2: Verify constraints
SELECT 
  'Geolocation Constraints Check' as test_name,
  COUNT(*) as constraint_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'contacts'
  AND constraint_name LIKE '%location%';

-- Test 3: Verify indexes
SELECT 
  'Geolocation Indexes Check' as test_name,
  COUNT(*) as index_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'contacts'
  AND indexname LIKE '%location%';

-- Test 4: Verify followups_by_segment function
SELECT 
  'followups_by_segment Function Check' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'followups_by_segment'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- Test 5: Verify fieldops_opportunity_radar function
SELECT 
  'fieldops_opportunity_radar Function Check' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'fieldops_opportunity_radar'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- ============================================================================
-- PART 3: FUNCTIONAL TESTS
-- ============================================================================

-- Test 6: followups_by_segment with priority_score
-- Replace YOUR_WORKSPACE_ID and YOUR_USER_ID
/*
SELECT 
  contact_name,
  contact_status,
  contact_lead_score,
  priority,
  priority_score,
  due_at
FROM followups_by_segment(
  'YOUR_WORKSPACE_ID'::uuid,
  'YOUR_USER_ID'::uuid,
  'today'
)
ORDER BY priority_score DESC
LIMIT 5;
*/

-- Test 7: fieldops_opportunity_radar with Haversine distance
-- Example: Find leads within 5km of Vienna city center
/*
SELECT 
  full_name,
  status,
  lead_score,
  distance_km,
  latitude,
  longitude
FROM fieldops_opportunity_radar(
  'YOUR_WORKSPACE_ID'::uuid,
  'YOUR_USER_ID'::uuid,
  48.2082::numeric,  -- Vienna lat
  16.3738::numeric,  -- Vienna lng
  5.0::numeric,      -- 5km radius
  10                 -- limit 10
)
ORDER BY distance_km ASC;
*/

-- ============================================================================
-- PART 4: PERFORMANCE TESTS
-- ============================================================================

-- Test 8: followups_by_segment performance
/*
EXPLAIN ANALYZE
SELECT * FROM followups_by_segment(
  'YOUR_WORKSPACE_ID'::uuid,
  'YOUR_USER_ID'::uuid,
  'today'
);
-- Expected: Execution Time < 150ms
*/

-- Test 9: fieldops_opportunity_radar performance
/*
EXPLAIN ANALYZE
SELECT * FROM fieldops_opportunity_radar(
  'YOUR_WORKSPACE_ID'::uuid,
  'YOUR_USER_ID'::uuid,
  48.2082::numeric,
  16.3738::numeric,
  5.0::numeric,
  10
);
-- Expected: Execution Time < 100ms (with bounding box optimization)
*/

-- ============================================================================
-- PART 5: DATA QUALITY TESTS
-- ============================================================================

-- Test 10: Check for invalid coordinates
SELECT 
  'Invalid Coordinates Check' as test_name,
  COUNT(*) as invalid_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '⚠️ WARNING - Found invalid coordinates'
  END as status
FROM public.contacts
WHERE (
  (latitude IS NOT NULL AND (latitude < -90 OR latitude > 90))
  OR (longitude IS NOT NULL AND (longitude < -180 OR longitude > 180))
);

-- Test 11: Check contacts with coordinates
SELECT 
  workspace_id,
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as with_location,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) / COUNT(*),
    2
  ) as location_coverage_percent
FROM public.contacts
GROUP BY workspace_id
ORDER BY total_contacts DESC;

-- Test 12: Verify priority score range
/*
WITH scores AS (
  SELECT priority_score
  FROM followups_by_segment(
    'YOUR_WORKSPACE_ID'::uuid,
    'YOUR_USER_ID'::uuid,
    'today'
  )
)
SELECT 
  'Priority Score Range Check' as test_name,
  MIN(priority_score) as min_score,
  MAX(priority_score) as max_score,
  AVG(priority_score) as avg_score,
  CASE 
    WHEN MIN(priority_score) >= 0 AND MAX(priority_score) <= 120 THEN '✅ PASS'
    ELSE '❌ FAIL - Score out of range 0-120'
  END as status
FROM scores;
*/

-- ============================================================================
-- PART 6: INDEX USAGE VERIFICATION
-- ============================================================================

-- Test 13: Check if geolocation indexes are being used
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  CASE 
    WHEN idx_scan > 0 THEN '✅ USED'
    ELSE '⚠️ UNUSED'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'contacts'
  AND indexname LIKE '%location%'
ORDER BY idx_scan DESC;

-- ============================================================================
-- PART 7: SAMPLE QUERIES FOR DEVELOPMENT
-- ============================================================================

-- Sample 1: Find all contacts with geolocation data
/*
SELECT 
  full_name,
  status,
  lead_score,
  latitude,
  longitude,
  location_source,
  location_updated_at
FROM public.contacts
WHERE workspace_id = 'YOUR_WORKSPACE_ID'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
ORDER BY location_updated_at DESC NULLS LAST
LIMIT 10;
*/

-- Sample 2: Priority score distribution
/*
WITH scores AS (
  SELECT 
    priority_score,
    CASE 
      WHEN priority_score >= 100 THEN 'Kritisch'
      WHEN priority_score >= 85 THEN 'Sehr hoch'
      WHEN priority_score >= 70 THEN 'Hoch'
      WHEN priority_score >= 50 THEN 'Mittel'
      ELSE 'Niedrig'
    END as priority_level
  FROM followups_by_segment(
    'YOUR_WORKSPACE_ID'::uuid,
    'YOUR_USER_ID'::uuid,
    'today'
  )
)
SELECT 
  priority_level,
  COUNT(*) as count,
  ROUND(AVG(priority_score), 2) as avg_score
FROM scores
GROUP BY priority_level
ORDER BY avg_score DESC;
*/

-- Sample 3: Nearby leads grouped by status
/*
WITH nearby AS (
  SELECT *
  FROM fieldops_opportunity_radar(
    'YOUR_WORKSPACE_ID'::uuid,
    'YOUR_USER_ID'::uuid,
    48.2082::numeric,
    16.3738::numeric,
    10.0::numeric,
    50
  )
)
SELECT 
  status,
  COUNT(*) as count,
  ROUND(AVG(distance_km), 2) as avg_distance_km,
  ROUND(AVG(lead_score), 1) as avg_lead_score
FROM nearby
GROUP BY status
ORDER BY count DESC;
*/

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_columns integer;
  v_indexes integer;
  v_functions integer;
BEGIN
  -- Check columns
  SELECT COUNT(*) INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'contacts'
    AND column_name IN ('latitude', 'longitude', 'location_source', 'location_accuracy', 'location_updated_at');

  -- Check indexes
  SELECT COUNT(*) INTO v_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'contacts'
    AND indexname LIKE '%location%';

  -- Check functions
  SELECT COUNT(*) INTO v_functions
  FROM pg_proc
  WHERE proname IN ('followups_by_segment', 'fieldops_opportunity_radar');

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'PRIORITY & GEOLOCATION SYSTEM - STATUS';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'Geolocation Columns: % / 5 %', v_columns, CASE WHEN v_columns = 5 THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'Geolocation Indexes: % / 3 %', v_indexes, CASE WHEN v_indexes >= 3 THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'RPC Functions: % / 2 %', v_functions, CASE WHEN v_functions = 2 THEN '✅' ELSE '❌' END;
  RAISE NOTICE '════════════════════════════════════════';
  
  IF v_columns = 5 AND v_indexes >= 3 AND v_functions = 2 THEN
    RAISE NOTICE '✅ ALL TESTS PASSED - SYSTEM READY!';
  ELSE
    RAISE WARNING '⚠️ SOME TESTS FAILED - CHECK ABOVE';
  END IF;
END $$;

