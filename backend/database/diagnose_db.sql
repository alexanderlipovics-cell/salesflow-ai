-- ╔════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - COMPLETE DATABASE DIAGNOSIS                   ║
-- ║  Prüft alle Tabellen, Views, Functions, Trigger, Indexes       ║
-- ╚════════════════════════════════════════════════════════════════╝

-- === SECTION 1: ALLE TABELLEN MIT SPALTEN-INFO ===
SELECT 
  '=== TABLES ===' AS section,
  table_schema,
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage')
ORDER BY table_schema, table_name, ordinal_position;

-- === SECTION 2: MATERIALIZED VIEWS ===
SELECT 
  '=== MATERIALIZED VIEWS ===' AS section,
  schemaname,
  matviewname,
  definition,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size
FROM pg_matviews
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, matviewname;

-- === SECTION 3: FUNCTIONS (RPCs) ===
SELECT 
  '=== FUNCTIONS ===' AS section,
  routine_schema,
  routine_name,
  data_type AS return_type,
  routine_definition
FROM information_schema.routines
WHERE routine_type='FUNCTION' 
  AND specific_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage')
ORDER BY routine_schema, routine_name;

-- === SECTION 4: TRIGGERS ===
SELECT 
  '=== TRIGGERS ===' AS section,
  event_object_schema,
  event_object_table AS table_name,
  trigger_name,
  action_timing,
  event_manipulation AS event_type,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY event_object_table, trigger_name;

-- === SECTION 5: INDEXES ===
SELECT 
  '=== INDEXES ===' AS section,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY tablename, indexname;

-- === SECTION 6: FOREIGN KEYS ===
SELECT 
  '=== FOREIGN KEYS ===' AS section,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY tc.table_name, kcu.column_name;

-- === SECTION 7: EXTENSIONS ===
SELECT 
  '=== EXTENSIONS ===' AS section,
  extname,
  extversion
FROM pg_extension
ORDER BY extname;

-- === SECTION 8: TABLE SIZES ===
SELECT 
  '=== TABLE SIZES ===' AS section,
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

