-- ============================================================================
-- Script: Remove Duplicate Leads
-- Purpose: Findet und löscht doppelte Leads (gleicher user_id + name/instagram)
--          Behält den ÄLTESTEN Lead (ersten erstellten)
-- ============================================================================
-- 
-- WICHTIG: 
-- 1. Führe zuerst die SELECT-Statements aus um zu sehen was gelöscht wird
-- 2. Prüfe die Ergebnisse sorgfältig
-- 3. Erstelle ein Backup bevor du DELETE ausführst
-- 4. Führe DELETE nur aus wenn du sicher bist!
-- ============================================================================

-- ============================================================================
-- STEP 1: ANALYSE - Zeige alle Duplikate
-- ============================================================================

-- Zeige alle Duplikate mit Details
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    name,
    instagram_username,
    email,
    phone,
    created_at,
    updated_at,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY 
        user_id, 
        LOWER(TRIM(COALESCE(name, ''))), 
        LOWER(TRIM(COALESCE(instagram_username, '')))
      ORDER BY created_at ASC
    ) as rn
  FROM leads
  WHERE 
    (name IS NOT NULL AND name != '') 
    OR (instagram_username IS NOT NULL AND instagram_username != '')
)
SELECT 
  rn,
  id,
  user_id,
  name,
  instagram_username,
  email,
  phone,
  created_at,
  status,
  CASE 
    WHEN rn = 1 THEN 'BEHALTEN (ältester)'
    ELSE 'LÖSCHEN (Duplikat)'
  END as action
FROM duplicates
WHERE rn > 1  -- Nur Duplikate anzeigen
ORDER BY user_id, LOWER(COALESCE(name, '')), LOWER(COALESCE(instagram_username, '')), created_at;

-- ============================================================================
-- STEP 2: ZUSAMMENFASSUNG - Wie viele werden gelöscht?
-- ============================================================================

SELECT 
  COUNT(*) as anzahl_zu_loeschen,
  COUNT(DISTINCT user_id) as betroffene_user,
  COUNT(DISTINCT LOWER(COALESCE(name, ''))) as betroffene_namen
FROM (
  SELECT 
    id,
    user_id,
    name,
    instagram_username,
    ROW_NUMBER() OVER (
      PARTITION BY 
        user_id, 
        LOWER(TRIM(COALESCE(name, ''))), 
        LOWER(TRIM(COALESCE(instagram_username, '')))
      ORDER BY created_at ASC
    ) as rn
  FROM leads
  WHERE 
    (name IS NOT NULL AND name != '') 
    OR (instagram_username IS NOT NULL AND instagram_username != '')
) sub
WHERE rn > 1;

-- ============================================================================
-- STEP 3: DETAILLIERTE ÜBERSICHT - Gruppiert nach Duplikat-Gruppe
-- ============================================================================

WITH duplicates AS (
  SELECT 
    id,
    user_id,
    name,
    instagram_username,
    created_at,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY 
        user_id, 
        LOWER(TRIM(COALESCE(name, ''))), 
        LOWER(TRIM(COALESCE(instagram_username, '')))
      ORDER BY created_at ASC
    ) as rn,
    COUNT(*) OVER (
      PARTITION BY 
        user_id, 
        LOWER(TRIM(COALESCE(name, ''))), 
        LOWER(TRIM(COALESCE(instagram_username, '')))
    ) as anzahl_duplikate
  FROM leads
  WHERE 
    (name IS NOT NULL AND name != '') 
    OR (instagram_username IS NOT NULL AND instagram_username != '')
)
SELECT 
  user_id,
  name,
  instagram_username,
  anzahl_duplikate,
  MIN(created_at) as aeltester_lead,
  MAX(created_at) as neuester_lead,
  STRING_AGG(id::text, ', ' ORDER BY created_at) as alle_ids,
  STRING_AGG(
    CASE WHEN rn = 1 THEN id::text || ' (BEHALTEN)' ELSE id::text || ' (LÖSCHEN)' END, 
    ' | ' 
    ORDER BY created_at
  ) as action_uebersicht
FROM duplicates
WHERE anzahl_duplikate > 1
GROUP BY user_id, name, instagram_username, anzahl_duplikate
ORDER BY anzahl_duplikate DESC, user_id, name;

-- ============================================================================
-- STEP 4: BACKUP ERSTELLEN (Empfohlen!)
-- ============================================================================

-- Erstelle Backup-Tabelle mit allen Leads die gelöscht werden
CREATE TABLE IF NOT EXISTS leads_backup_duplicates AS
SELECT 
  l.*,
  'duplicate_to_delete' as backup_reason,
  NOW() as backup_created_at
FROM leads l
WHERE l.id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY 
          user_id, 
          LOWER(TRIM(COALESCE(name, ''))), 
          LOWER(TRIM(COALESCE(instagram_username, '')))
        ORDER BY created_at ASC
      ) as rn
    FROM leads
    WHERE 
      (name IS NOT NULL AND name != '') 
      OR (instagram_username IS NOT NULL AND instagram_username != '')
  ) sub
  WHERE rn > 1
);

-- Zeige wie viele im Backup sind
SELECT COUNT(*) as backup_count FROM leads_backup_duplicates;

-- ============================================================================
-- STEP 5: DELETE - NUR AUSFÜHREN WENN DU SICHER BIST!
-- ============================================================================

-- ⚠️ WARNUNG: Dieser DELETE löscht permanent Daten!
-- ⚠️ Stelle sicher dass:
--    1. Du die SELECT-Statements oben geprüft hast
--    2. Ein Backup erstellt wurde
--    3. Du wirklich die Duplikate löschen willst

-- UNCOMMENT um auszuführen:
/*
DELETE FROM leads 
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY 
          user_id, 
          LOWER(TRIM(COALESCE(name, ''))), 
          LOWER(TRIM(COALESCE(instagram_username, '')))
        ORDER BY created_at ASC
      ) as rn
    FROM leads
    WHERE 
      (name IS NOT NULL AND name != '') 
      OR (instagram_username IS NOT NULL AND instagram_username != '')
  ) sub
  WHERE rn > 1
);
*/

-- ============================================================================
-- STEP 6: VERIFIKATION - Prüfe ob alle Duplikate weg sind
-- ============================================================================

-- Nach dem DELETE: Prüfe ob noch Duplikate existieren
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    name,
    instagram_username,
    ROW_NUMBER() OVER (
      PARTITION BY 
        user_id, 
        LOWER(TRIM(COALESCE(name, ''))), 
        LOWER(TRIM(COALESCE(instagram_username, '')))
      ORDER BY created_at ASC
    ) as rn
  FROM leads
  WHERE 
    (name IS NOT NULL AND name != '') 
    OR (instagram_username IS NOT NULL AND instagram_username != '')
)
SELECT 
  COUNT(*) as verbleibende_duplikate
FROM duplicates
WHERE rn > 1;

-- Sollte 0 zurückgeben wenn alles geklappt hat!

