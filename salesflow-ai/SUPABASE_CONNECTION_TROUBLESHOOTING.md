# 🔧 Supabase-Verbindungsproblem beheben (Cloudflare 521)

## Problem
**Fehler:** `Cloudflare 521 - Web server is down`  
**Ursache:** Supabase-Projekt ist nicht erreichbar

## Mögliche Ursachen

### 1. ⏸️ Supabase-Projekt ist pausiert (Häufigste Ursache)
Supabase pausiert Free-Tier-Projekte automatisch nach 7 Tagen Inaktivität.

**Lösung:**
1. Öffnen Sie [Supabase Dashboard](https://app.supabase.com)
2. Wählen Sie Ihr Projekt aus
3. Klicken Sie auf **"Restore project"** oder **"Resume"**
4. Warten Sie 1-2 Minuten, bis das Projekt wieder online ist

### 2. 🔗 Falsche Supabase-URL
Die konfigurierte URL stimmt nicht mit Ihrem Projekt überein.

**Prüfen:**
1. Öffnen Sie Ihr Supabase-Dashboard
2. Gehen Sie zu **Settings → API**
3. Kopieren Sie die **Project URL** (z.B. `https://xxxxx.supabase.co`)
4. Vergleichen Sie mit Ihrer `.env` Datei

**Backend `.env` Datei prüfen:**
```bash
# In backend/.env sollte stehen:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 3. 🔑 Falscher Service Role Key
Der Service Role Key ist falsch oder fehlt.

**Prüfen:**
1. Supabase Dashboard → **Settings → API**
2. Kopieren Sie den **service_role** Key (NICHT den anon key!)
3. Stellen Sie sicher, dass er in `backend/.env` als `SUPABASE_SERVICE_ROLE_KEY` gesetzt ist

### 4. 🌐 Netzwerk-/Cloudflare-Problem
Temporäres Problem mit Cloudflare oder Supabase-Infrastruktur.

**Lösung:**
1. Warten Sie 5-10 Minuten
2. Versuchen Sie es erneut
3. Prüfen Sie [Supabase Status](https://status.supabase.com)

## Schnellprüfung

### Schritt 1: Backend-Logs prüfen
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Suchen Sie nach Fehlermeldungen wie:
- `SupabaseNotConfiguredError`
- `Connection refused`
- `521 Web server is down`

### Schritt 2: Supabase-Verbindung testen
Erstellen Sie eine Testdatei `test_supabase.py`:

```python
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env")
    exit(1)

try:
    supabase = create_client(url, key)
    # Test-Query
    result = supabase.table("users").select("count").limit(1).execute()
    print("✅ Supabase-Verbindung erfolgreich!")
except Exception as e:
    print(f"❌ Fehler: {e}")
```

Führen Sie aus:
```bash
cd backend
python test_supabase.py
```

### Schritt 3: Environment-Variablen prüfen
```bash
cd backend
# Windows PowerShell:
Get-Content .env | Select-String "SUPABASE"

# Oder manuell öffnen:
notepad .env
```

Stellen Sie sicher, dass vorhanden:
- `SUPABASE_URL=https://xxxxx.supabase.co` (OHNE trailing slash!)
- `SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...` (service_role, nicht anon!)

## Häufige Fehler

### ❌ Falsch:
```env
SUPABASE_URL=https://xxxxx.supabase.co/  # Trailing slash entfernen!
SUPABASE_KEY=eyJ...  # Muss SUPABASE_SERVICE_ROLE_KEY heißen!
```

### ✅ Richtig:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Nach dem Fix

1. **Backend neu starten:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Frontend testen:**
   - Öffnen Sie `http://localhost:5174/signup`
   - Versuchen Sie sich zu registrieren

3. **Wenn es immer noch nicht funktioniert:**
   - Prüfen Sie die Browser-Console (F12)
   - Prüfen Sie die Backend-Logs
   - Prüfen Sie, ob Supabase-Projekt wirklich online ist (Dashboard)

## Support

Wenn nichts hilft:
1. Prüfen Sie [Supabase Status Page](https://status.supabase.com)
2. Prüfen Sie [Supabase Discord Community](https://discord.supabase.com)
3. Erstellen Sie ein Support-Ticket im Supabase Dashboard

---

**Letzte Aktualisierung:** 2025-01-06

