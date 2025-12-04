# 🔄 NEUSTART ANLEITUNG

## ✅ Dependencies aktualisiert!

Alle Dependencies wurden aktualisiert:
- ✅ Frontend (npm packages)
- ✅ Backend (Python packages)

## 🚀 JETZT STARTEN:

### Option 1: Manuell (2 Terminals)

**Terminal 1 - Backend:**
```powershell
cd src/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```powershell
npm start
```

### Option 2: Mit Start-Scripts

**Backend:**
```powershell
.\START_BACKEND.ps1
```

**Frontend:**
```powershell
.\START_FRONTEND.ps1
```

## 📋 Was wurde aktualisiert:

1. ✅ **Frontend Dependencies** (`npm install`)
2. ✅ **Backend Dependencies** (`pip install -r requirements.txt`)
3. ✅ **Start-Scripts erstellt** (`START_BACKEND.ps1`, `START_FRONTEND.ps1`)

## 🎯 Nächste Schritte:

1. Backend starten (Terminal 1)
2. Frontend starten (Terminal 2)
3. App testen:
   - Landing Page → Login Button
   - Login → App Navigation
   - Settings → Vertical Switch
   - Chat → Prompt Testing

