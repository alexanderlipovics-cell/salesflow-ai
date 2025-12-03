-- Wir schalten die RLS-Prüfung für die Tabelle 'leads' komplett aus.
-- Damit darf JEDER lesen und schreiben (perfekt für Localhost Development).
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

