# 🚀 SALES FLOW AI - DEPLOYMENT GUIDE

## ✅ Vorbereitung abgeschlossen!
- [x] Git Commit erstellt
- [x] Vercel CLI installiert
- [x] EAS CLI installiert

---

## A) 🔵 VERCEL DEPLOYMENT (Frontend Web)

### Schritt 1: Login
```powershell
vercel login
```
→ Browser öffnet sich, mit Vercel Account einloggen

### Schritt 2: Deploy
```powershell
vercel --prod
```
→ Fertig! URL wird angezeigt (z.B. salesflow-app.vercel.app)

---

## B) 📱 EAS BUILD (Mobile Apps)

### Schritt 1: Login
```powershell
eas login
```
→ Expo Account eingeben

### Schritt 2: Build starten
```powershell
# Nur Android:
eas build --platform android --profile production

# Nur iOS:
eas build --platform ios --profile production

# Beide:
eas build --platform all --profile production
```
→ Build läuft auf Expo Servern, Download-Link wird per Email geschickt

---

## C) 🖥️ RENDER.COM (Backend API)

### Schritt 1: GitHub Repository erstellen
1. Gehe zu: https://github.com/new
2. Name: `salesflow-api`
3. Private Repository
4. Erstellen

### Schritt 2: Code pushen
```powershell
git remote add origin https://github.com/DEIN_USERNAME/salesflow-api.git
git push -u origin master
```

### Schritt 3: Render verbinden
1. Gehe zu: https://dashboard.render.com
2. **New → Web Service**
3. **Connect GitHub** → Repository auswählen
4. `render.yaml` wird automatisch erkannt!

### Schritt 4: Environment Variables setzen
```
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=dein-geheimer-schlüssel
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
```

---

## 📊 Erwartete URLs nach Deployment

| Service | URL |
|---------|-----|
| **Frontend** | `https://salesflow-app.vercel.app` |
| **Backend** | `https://salesflow-api.onrender.com` |
| **Mobile** | App Store / Play Store |

---

## ⚡ QUICK DEPLOY (Copy & Paste)

```powershell
# 1. Vercel (im Browser einloggen wenn gefragt)
vercel login
vercel --prod

# 2. EAS (im Terminal einloggen)
eas login
eas build --platform all --profile production
```

---

## 🎉 Fertig!

Nach dem Deployment sind folgende Features live:
- ✅ CHIEF AI Chat mit Locked Block™
- ✅ Liability Shield™ Compliance
- ✅ DISC Neuro-Profiler
- ✅ Live Assist mit Einwandbehandlung
- ✅ Dashboard mit Analytics
- ✅ Multi-Language (DE/EN/ES/ZH)

