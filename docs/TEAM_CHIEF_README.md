# 🧠 TEAM-CHIEF - AI Squad Coaching System

**Status:** ✅ Vollständig implementiert

---

## 📋 Übersicht

**TEAM-CHIEF** ist ein KI-gestütztes Squad-Coaching-System für Network Marketing Team Leader. Das System analysiert Squad-Performance-Daten und liefert umsetzbare Coaching-Insights auf Deutsch.

### Features

- ✅ **AI-gestützte Analyse** - GPT-4o-mini analysiert Squad-Performance
- ✅ **Personalisierte Insights** - Konkrete Handlungsempfehlungen pro Member
- ✅ **Nachrichtenvorlagen** - WhatsApp-taugliche Templates zum Kopieren
- ✅ **Privacy-First** - Keine Rohkontakte, nur aggregierte Statistiken
- ✅ **Geschichte speichern** - Coaching-Sessions werden in DB gespeichert

---

## 🏗️ Architektur

### **1. System Prompt** ✅
**Datei:** `backend/app/prompts/team_chief.py`

**Was es macht:**
- Definiert die Rolle von TEAM-CHIEF als AI-Coach
- Spezifiziert Ein- und Ausgabeformat (JSON)
- Setzt Tonalität und Compliance-Regeln

### **2. FastAPI Router** ✅
**Datei:** `backend/app/routers/squad_coach.py`

**Endpoint:** `POST /api/squad/coach`

**Was es macht:**
- Verifiziert Leader-Berechtigung
- Sammelt Squad-Daten (Leaderboard, Member Stats, Challenge Info)
- Ruft OpenAI API auf für Coaching-Insights
- Speichert Session in Datenbank

### **3. TypeScript Types** ✅
**Datei:** `salesflow-ai/src/types/coaching.ts`

**Was es definiert:**
- `SquadCoachingInput` - Eingabeformat für AI
- `SquadCoachingOutput` - Ausgabeformat mit Insights
- `CoachingAction` - Einzelne Coaching-Empfehlung

### **4. React Component** ✅
**Datei:** `salesflow-ai/src/components/coaching/TeamChiefCoach.tsx`

**Features:**
- Komplette Coaching-Dashboard UI
- Copy-to-Clipboard für Nachrichtenvorlagen
- Farbcodierte Insights (Highlights, Risks, Priorities)
- Responsive Design

### **5. Database Schema** ✅
**Datei:** `backend/database/coaching_sessions_schema.sql`

**Was es erstellt:**
- `coaching_sessions` Tabelle
- RLS Policies für Privacy
- Indexes für Performance

---

## 🚀 Deployment Checklist

### **Phase 1: Database Setup**

- [ ] **SQL Schema ausführen**
  - Öffne Supabase Dashboard → SQL Editor
  - Kopiere Inhalt von `backend/database/coaching_sessions_schema.sql`
  - RUN ▶️
  - Verifiziere: `coaching_sessions` Tabelle existiert

### **Phase 2: Backend Setup**

- [ ] **Router ist bereits eingebunden** in `backend/app/main.py`
- [ ] **Umgebungsvariablen prüfen:**
  ```bash
  OPENAI_API_KEY=sk-your-key-here
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_KEY=your-service-key
  ```

- [ ] **Backend Server starten:**
  ```bash
  cd backend
  uvicorn app.main:app --reload --port 8000
  ```

### **Phase 3: Frontend Integration**

- [ ] **Component importieren** in deine Squad-Seite:
  ```tsx
  import { TeamChiefCoach } from "@/components/coaching/TeamChiefCoach";
  
  // In deiner Squad-Detail-Seite:
  <TeamChiefCoach squadId={currentSquadId} />
  ```

- [ ] **Test im Browser:**
  - Navigiere zur Squad-Seite
  - Klicke "Squad analysieren"
  - Warte auf AI-Generierung (2-5 Sekunden)
  - Prüfe Insights & Nachrichtenvorlagen

---

## 📚 API Usage

### **Request**

```bash
POST /api/squad/coach
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "squad_id": "uuid-here"
}
```

### **Response**

```json
{
  "summary": "Dein Squad zeigt solide Aktivität...",
  "highlights": [
    "Lisa ist klar vorne mit 450 Punkten",
    "Team-Momentum steigt"
  ],
  "risks": [
    "3 Mitglieder haben diese Woche noch nichts gemacht"
  ],
  "priorities": [
    "Check-in bei den Inaktiven",
    "Lisa als Vorbild nutzen"
  ],
  "coaching_actions": [
    {
      "target_type": "member",
      "target_name": "Max",
      "reason": "Hat 7 Tage nicht aktiv gearbeitet",
      "suggested_action": "Empathischer Check-in: 'Hey Max, wie geht es dir? Alles okay?'",
      "tone_hint": "empathisch"
    }
  ],
  "celebrations": [
    "Lisa explizit loben für ihre Führung"
  ],
  "suggested_messages": {
    "to_squad": "Hey Team! Wir sind auf einem guten Weg...",
    "to_underperformer_template": "Hey [Name], wie geht es dir? Brauchst du Unterstützung?",
    "to_top_performer_template": "Hey [Name], du rockst! 🚀"
  }
}
```

---

## 🎨 UI Features

### **Dashboard Sections**

1. **Zusammenfassung** - Kurze Übersicht in 2-4 Sätzen
2. **Highlights** - Was läuft gut (grün)
3. **Risiken** - Wo es hakt (orange)
4. **Prioritäten** - Konkrete Aktionen diese Woche
5. **Coaching-Aktionen** - Personenspezifische Empfehlungen
6. **Feiern** - Loben & Wertschätzen
7. **Nachrichtenvorlagen** - Copy-to-Clipboard Templates

### **Design**

- **Dark Mode optimiert** - Slate-Farbpalette
- **Farbcodierung:**
  - Grün: Highlights & Erfolge
  - Orange: Risiken & Warnungen
  - Blau: Informationen & Prioritäten
  - Gelb: Feiern & Wertschätzung
- **Copy-to-Clipboard** - Ein Klick für Nachrichtenvorlagen

---

## 💰 Kosten & Performance

### **Kosten**

- **GPT-4o-mini:** ~$0.0001 pro Coaching-Session
- **Sehr günstig** für häufige Nutzung
- **Empfehlung:** Cache Insights für 1-6 Stunden

### **Performance**

- **API Response Time:** 2-5 Sekunden (OpenAI Processing)
- **Optimierungen:**
  - Caching von Insights (optional)
  - Asynchrones Speichern in DB
  - Fehlerbehandlung mit Fallbacks

---

## 🔧 Troubleshooting

### **Problem: 401 Unauthorized**

**Lösung:**
- Prüfe Auth Token im Request Header
- Stelle sicher, dass User eingeloggt ist
- Teste mit Supabase Dashboard → Authentication

### **Problem: 403 Forbidden**

**Lösung:**
- User muss Leader oder Co-Leader des Squads sein
- Prüfe `squad_members` Tabelle: `role` muss `leader` oder `co_leader` sein

### **Problem: 404 No Active Challenge**

**Lösung:**
- Squad braucht eine aktive Challenge
- Erstelle Challenge über `/api/squad/challenge` Endpoint

### **Problem: OpenAI API Fehler**

**Lösung:**
- Prüfe `OPENAI_API_KEY` in `.env`
- Prüfe OpenAI API Quota
- Fallback: Mock-Response wird zurückgegeben

---

## 📝 Testing Scenarios

1. **Squad mit klarem Leader** - Top-Performer klar vorne
2. **Ausgewogenes Squad** - Mehrere Mitglieder nah beieinander
3. **Struggling Squad** - Niedrige Engagement, viele Inaktive
4. **Mixed Performance** - Einige Stars, einige Nachzügler
5. **Leeres/Neues Squad** - Wenige oder keine Mitglieder

---

## 🔄 Nächste Schritte

- [ ] **Feedback-System** - Leader können Insights bewerten
- [ ] **Coaching-Historie** - Alle vergangenen Coaching-Sessions anzeigen
- [ ] **Push-Benachrichtigungen** - Leader informieren bei Risiken
- [ ] **Automatische Reports** - Wöchentliche Coaching-Email

---

## ✅ Status

- [x] System Prompt erstellt
- [x] FastAPI Router erstellt
- [x] TypeScript Types definiert
- [x] Frontend Component erstellt
- [x] Database Schema erstellt
- [ ] Router in main.py eingebunden (automatisch)
- [ ] SQL Schema ausgeführt (User)
- [ ] Frontend integriert (User)

**Bereit für Deployment!** 🚀

