-- ============================================
-- CEO Chat File Upload Setup (Supabase)
-- ============================================
-- 
-- FÜHRE DIESE SCHRITTE MANUELL IN SUPABASE AUS:
--
-- 1. Gehe zu Supabase Dashboard → Storage
-- 2. Erstelle neuen Bucket: "chief-uploads"
-- 3. Setze Bucket auf "Private"
-- 4. Führe die folgenden SQL-Befehle im SQL Editor aus:
--

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Erlaube Uploads nur für authentifizierte User in ihren eigenen Ordner
CREATE POLICY "CEO Upload Policy" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( 
  bucket_id = 'chief-uploads' 
  AND (storage.foldername(name))[1] = auth.uid()::text 
);

-- Erlaube Lesen nur für eigene Dateien
CREATE POLICY "CEO View Policy" 
ON storage.objects FOR SELECT 
TO authenticated 
USING ( 
  bucket_id = 'chief-uploads' 
  AND (storage.foldername(name))[1] = auth.uid()::text 
);

-- Erlaube Löschen nur für eigene Dateien
CREATE POLICY "CEO Delete Policy" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( 
  bucket_id = 'chief-uploads' 
  AND (storage.foldername(name))[1] = auth.uid()::text 
);

-- ============================================
-- OPTIONAL: SESSION VIEW (für schnelle Sidebar-Abfrage)
-- ============================================

CREATE OR REPLACE VIEW user_chat_sessions AS
SELECT 
    cs.id as session_id,
    cs.user_id,
    cs.created_at as started_at,
    cs.updated_at,
    cs.title,
    (SELECT COUNT(*) FROM chief_messages cm WHERE cm.session_id = cs.id) as message_count
FROM chief_sessions cs
ORDER BY cs.updated_at DESC;

-- ============================================
-- HINWEIS:
-- ============================================
-- Die Tabellen chief_sessions und chief_messages müssen bereits existieren.
-- Falls nicht, werden sie automatisch vom Backend erstellt.

