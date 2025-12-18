# ⚡ DATABASE MIGRATION - Quick Start

**Problem:** users Tabelle existiert nicht  
**Lösung:** SQL Migration ausführen (2 Minuten)

---

## 🚀 SCHRITT-FÜR-SCHRITT

### Option 1: Supabase Dashboard (Empfohlen)

1. **Öffne:** https://supabase.com/dashboard
2. **Wähle dein Projekt:** SalesFlow AI
3. **Gehe zu:** SQL Editor (linke Sidebar)
4. **Klick:** "New Query"
5. **Kopiere den kompletten Inhalt von:**
   ```
   backend/migrations/20250105_create_users_table.sql
   ```
6. **Paste** in den SQL Editor
7. **Klick:** "Run" (unten rechts)
8. **Fertig!** ✅

### Option 2: psql (Kommandozeile)

```bash
# Wenn du psql installiert hast:
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f backend/migrations/20250105_create_users_table.sql
```

---

## ✅ VERIFIKATION

Nach der Migration sollte in Supabase:

1. **Table Editor** → Tabelle `users` sichtbar sein
2. **Spalten:**
   - id (UUID, Primary Key)
   - email (VARCHAR, UNIQUE)
   - password_hash (VARCHAR)
   - name (VARCHAR)
   - company (VARCHAR, nullable)
   - role (VARCHAR, default: 'user')
   - is_active (BOOLEAN, default: true)
   - created_at (TIMESTAMPTZ)
   - updated_at (TIMESTAMPTZ, nullable)
   - last_login (TIMESTAMPTZ, nullable)

---

## 🧪 DANN TESTEN

Nach Migration:

1. **Refresh:** http://localhost:5174/signup
2. **Neues Konto erstellen:**
   - Name: Test User
   - Email: test@example.com
   - Password: Test123!
3. **Submit**
4. **✅ Sollte funktionieren!**

---

## 🔍 QUICK CHECK

Prüfe ob Tabelle existiert:

```sql
-- In Supabase SQL Editor:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'users';
```

Wenn Ergebnis leer → Migration noch nicht ausgeführt  
Wenn Ergebnis zeigt "users" → Migration erfolgreich ✅

---

**Zeit:** 2 Minuten  
**Schwierigkeit:** Einfach (Copy & Paste)

---

**Nach Migration → Signup funktioniert!** 🚀

