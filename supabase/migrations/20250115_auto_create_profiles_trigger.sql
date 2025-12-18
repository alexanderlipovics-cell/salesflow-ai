-- ============================================================================
-- Migration: auto_create_profiles_trigger
-- Purpose  : Automatische Erstellung von profiles Eintrag bei auth.users Signup
-- Date     : 2025-01-15
-- ============================================================================
-- 
-- Problem: Wenn ein User sich über Supabase Auth registriert (Frontend),
-- wird er in auth.users erstellt, aber NICHT in profiles Tabelle.
-- Dadurch kann User sich nicht einloggen.
--
-- Lösung: Trigger der automatisch einen Eintrag in profiles erstellt,
-- wenn ein User in auth.users erstellt wird.
-- ============================================================================

-- Funktion zum Erstellen eines profiles Eintrags
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Erstelle Eintrag in profiles Tabelle
    -- profiles.id sollte mit auth.users.id übereinstimmen
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        full_name,
        updated_at
    )
    VALUES (
        NEW.id,  -- auth.users.id
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;  -- Falls Profil bereits existiert, nichts tun
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger auf auth.users Tabelle
-- Wird ausgelöst, wenn ein neuer User in auth.users erstellt wird
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Kommentare
COMMENT ON FUNCTION public.handle_new_user() IS 
    'Erstellt automatisch einen Eintrag in profiles Tabelle, wenn ein User in auth.users erstellt wird';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
    'Automatische Erstellung von profiles Eintrag bei User-Registrierung über Supabase Auth';

