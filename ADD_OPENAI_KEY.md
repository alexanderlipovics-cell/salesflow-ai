# 🔑 OpenAI API Key hinzufügen

**Kurzanleitung zum Hinzufügen des OpenAI API Keys**

---

## 📍 WICHTIG: Welche Datei?

**Für Vite-Projekte (Frontend):** `.env` (nicht `.env.local`)  
**Für Backend:** `backend/.env`

---

## 🎨 FRONTEND: OpenAI Key hinzufügen

### **Schritt 1: Navigiere zum Frontend-Ordner**

```powershell
cd salesflow-ai
```

### **Schritt 2: Öffne .env Datei**

```powershell
# Option A: Mit Notepad
notepad .env

# Option B: Mit VS Code
code .env

# Option C: Mit PowerShell
notepad .env
```

### **Schritt 3: Füge diese Zeile hinzu**

**WICHTIG:** In Vite müssen Environment-Variablen mit `VITE_` beginnen!

```env
# Füge diese Zeile hinzu (mit deinem echten Key):
VITE_OPENAI_API_KEY=sk-proj-DEIN-KEY-HIER
```

**Beispiel:**
```env
# Sales Flow AI - Frontend Environment Variables

# API Configuration
VITE_API_BASE_URL=/api

# Supabase Configuration
VITE_SUPABASE_URL=https://lncwvbhcafkdorypnpnz.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI API Key (NEU)
VITE_OPENAI_API_KEY=sk-proj-abc123xyz...
```

### **Schritt 4: Speichern**

- **Notepad:** `Ctrl+S`
- **VS Code:** `Ctrl+S`
- **PowerShell:** Datei schließen (wird automatisch gespeichert)

### **Schritt 5: Verify**

```powershell
# Prüfe ob der Key vorhanden ist
cat .env | Select-String "OPENAI"

# ✅ Sollte jetzt den Key zeigen (teilweise)
# Beispiel Output:
# VITE_OPENAI_API_KEY=sk-proj-abc123xyz...
```

### **Schritt 6: Verify komplett**

```powershell
# Zeige alle Environment Variables
cat .env

# ✅ Sollte alle Environment Variables zeigen
```

### **Schritt 7: Frontend neu starten**

```powershell
# WICHTIG: Frontend muss neu gestartet werden!
# Stoppe aktuellen Dev-Server (Ctrl+C)
# Dann neu starten:
npm run dev
```

**Warum?** Vite lädt Environment-Variablen nur beim Start!

---

## 🔧 BACKEND: OpenAI Key hinzufügen

### **Schritt 1: Navigiere zum Backend-Ordner**

```powershell
cd backend
```

### **Schritt 2: Öffne .env Datei**

```powershell
notepad .env
```

### **Schritt 3: Füge diese Zeile hinzu**

**WICHTIG:** Im Backend heißt es `OPENAI_API_KEY` (ohne VITE_)

```env
# Füge diese Zeile hinzu (mit deinem echten Key):
OPENAI_API_KEY=sk-proj-DEIN-KEY-HIER
```

**Beispiel:**
```env
# Sales Flow AI Backend - Environment Variables

# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-abc123xyz...

# Supabase Configuration
SUPABASE_URL=https://lncwvbhcafkdorypnpnz.supabase.co
SUPABASE_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here

# Server Configuration
PORT=8000
HOST=0.0.0.0

# Environment
ENVIRONMENT=development
DEBUG=True
BACKEND_PORT=8000
```

### **Schritt 4: Speichern**

- **Notepad:** `Ctrl+S`

### **Schritt 5: Verify**

```powershell
# Prüfe ob der Key vorhanden ist
cat .env | Select-String "OPENAI"

# ✅ Sollte jetzt den Key zeigen
```

### **Schritt 6: Backend neu starten**

```powershell
# WICHTIG: Backend muss neu gestartet werden!
# Stoppe aktuellen Server (Ctrl+C)
# Dann neu starten:
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

---

## 🔑 API Key holen

**Falls du noch keinen OpenAI API Key hast:**

1. Gehe zu: https://platform.openai.com/api-keys
2. Klicke: **"Create new secret key"**
3. Kopiere den Key (beginnt mit `sk-proj-...`)
4. **WICHTIG:** Key wird nur einmal angezeigt! Sofort kopieren!

---

## ✅ VERIFICATION CHECKLIST

Nach dem Hinzufügen des Keys:

### **Frontend:**

```powershell
cd salesflow-ai

# 1. Prüfe .env Datei
cat .env | Select-String "VITE_OPENAI_API_KEY"
# ✅ Sollte den Key zeigen

# 2. Starte Frontend neu
npm run dev

# 3. Prüfe in Browser Console (F12)
# → Keine Fehler bezüglich OpenAI
```

### **Backend:**

```powershell
cd backend

# 1. Prüfe .env Datei
cat .env | Select-String "OPENAI_API_KEY"
# ✅ Sollte den Key zeigen

# 2. Starte Backend neu
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000

# 3. Teste Health Endpoint
curl http://localhost:8000/health
# ✅ Sollte "online" zurückgeben
```

---

## 🐛 TROUBLESHOOTING

### **Problem: Key wird nicht erkannt**

**Lösung 1: Frontend/Backend neu starten**
```powershell
# Vite und FastAPI laden Environment-Variablen nur beim Start!
# Stoppe Server (Ctrl+C) und starte neu
```

**Lösung 2: Prüfe Dateiname**
```powershell
# Frontend: Muss .env heißen (nicht .env.local)
# Backend: Muss .env heißen

# Prüfe:
ls salesflow-ai/.env
ls backend/.env
```

**Lösung 3: Prüfe Präfix**
```powershell
# Frontend: Muss VITE_OPENAI_API_KEY heißen
# Backend: Muss OPENAI_API_KEY heißen

# Prüfe:
cat salesflow-ai/.env | Select-String "VITE_OPENAI"
cat backend/.env | Select-String "OPENAI_API_KEY"
```

### **Problem: "OPENAI_API_KEY nicht konfiguriert"**

**Lösung:**
```powershell
# 1. Prüfe ob Key in .env steht
cat backend/.env | Select-String "OPENAI"

# 2. Falls nicht vorhanden, füge hinzu:
# OPENAI_API_KEY=sk-proj-DEIN-KEY-HIER

# 3. Backend neu starten
```

### **Problem: Key funktioniert nicht**

**Lösung:**
```powershell
# 1. Prüfe ob Key korrekt kopiert wurde (keine Leerzeichen)
# 2. Prüfe ob Key noch aktiv ist (OpenAI Dashboard)
# 3. Prüfe ob Key genug Credits hat
# 4. Prüfe ob Key die richtigen Permissions hat
```

---

## 📝 QUICK REFERENCE

### **Frontend (.env):**
```env
VITE_OPENAI_API_KEY=sk-proj-DEIN-KEY-HIER
```

### **Backend (.env):**
```env
OPENAI_API_KEY=sk-proj-DEIN-KEY-HIER
```

### **Nach Änderungen:**
- ✅ Frontend neu starten: `npm run dev`
- ✅ Backend neu starten: `python -m uvicorn app.main:app --reload`

---

## 🔒 SECURITY NOTE

**WICHTIG:**
- ✅ `.env` Dateien sind in `.gitignore` (werden nicht committed)
- ✅ Niemals API Keys in Git committen!
- ✅ Für Production: Setze Keys in Vercel/Railway Dashboard
- ✅ Teile Keys niemals öffentlich!

---

**Fertig! 🎉**

Dein OpenAI API Key ist jetzt konfiguriert!

