# 🔐 FRONTEND ENVIRONMENT SETUP

## .env Datei erstellen

**Erstelle diese Datei:** `salesflow-ai/.env`

```env
# Sales Flow AI - Frontend Environment Variables

# API Configuration
VITE_API_BASE_URL=/api

# Supabase Configuration
VITE_SUPABASE_URL=https://lncwvbhcafkdorypnpnz.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# OpenAI API Key (für Edge Functions / AI Features)
VITE_OPENAI_API_KEY=sk-proj-your-openai-key-here
```

**WICHTIG:** In Vite müssen Environment-Variablen mit `VITE_` beginnen!

---

## ⚡ WICHTIG: API Keys einholen

### **Supabase Key:**

1. Gehe zu: https://supabase.com/dashboard/project/lncwvbhcafkdorypnpnz/settings/api
2. Kopiere den **anon/public** Key
3. Ersetze `your-anon-key-here` mit dem echten Key

### **OpenAI Key:**

1. Gehe zu: https://platform.openai.com/api-keys
2. Klicke: **"Create new secret key"**
3. Kopiere den Key (beginnt mit `sk-proj-...`)
4. Ersetze `your-openai-key-here` mit dem echten Key

**WICHTIG:** Keys werden nur einmal angezeigt! Sofort kopieren!

### **Nach dem Hinzufügen:**

4. Speichern & Frontend neu starten!
   ```bash
   # Frontend muss neu gestartet werden, damit neue Environment-Variablen geladen werden
   npm run dev
   ```

---

## ✅ Validierung

Nach dem Erstellen der .env:

```bash
# Frontend neu starten
npm run dev
```

Die App sollte nun mit dem Backend kommunizieren können!

---

## 🔒 Security Note

Die `.env` Datei ist automatisch in `.gitignore` und wird NICHT committed.
Das ist gut so - niemals API Keys in Git!

Für Production: Setze die Environment Variables in Vercel/Netlify Dashboard.

