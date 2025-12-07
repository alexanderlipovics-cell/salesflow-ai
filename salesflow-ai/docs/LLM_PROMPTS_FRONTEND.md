# 🤖 LLM-Prompts für Frontend-Entwicklung

Diese Prompts kannst du an **GPT, Claude oder Gemini** geben, um die Frontend-Komponenten zu erstellen.

---

## 📋 Prompt 1: Closing Coach Page

```
Du bist ein Senior React/TypeScript Entwickler. Erstelle eine React-Komponente für eine "Closing Coach" Page.

KONTEXT:
- Framework: React mit TypeScript
- Routing: React Router
- API: FastAPI Backend auf /api/closing-coach
- Styling: Tailwind CSS (wenn vorhanden) oder CSS Modules
- State Management: React Hooks (useState, useEffect)

ANFORDERUNGEN:
1. Erstelle eine Page-Komponente: `src/pages/ClosingCoachPage.tsx`
2. Die Page soll:
   - Liste aller Deals anzeigen (GET /api/closing-coach/my-deals)
   - Für jeden Deal: Closing-Score, Blocker, empfohlene Strategien anzeigen
   - Button "Analysieren" für jeden Deal (POST /api/closing-coach/analyze/{deal_id})
   - Loading-States und Error-Handling
   - Responsive Design

3. API-Struktur:
   - GET /api/closing-coach/my-deals → List[ClosingInsight]
   - POST /api/closing-coach/analyze/{deal_id} → ClosingInsight
   
   ClosingInsight Schema:
   {
     id: UUID
     deal_id: UUID
     closing_score: number (0-100)
     closing_probability: "low" | "medium" | "high"
     detected_blockers: Array<{
       type: string
       severity: "low" | "medium" | "high"
       context: string
       recommendation: string
     }>
     recommended_strategies: Array<{
       strategy: string
       script: string
       confidence: number
     }>
     suggested_next_action: string
   }

4. Design:
   - Karten-Layout für Deals
   - Farbcodierung: Rot (<50), Gelb (50-70), Grün (>70) für Closing-Score
   - Blocker als Warnungen anzeigen
   - Strategien als klickbare Karten
   - Copy-to-Clipboard für Scripts

5. Nutze bestehende Patterns aus dem Codebase:
   - API-Calls: fetch() oder axios
   - Auth: Supabase Auth (getSession())
   - Error-Handling: try/catch mit User-Feedback

ERSTELLE:
- Vollständigen TypeScript-Code
- Alle notwendigen Imports
- Type-Definitionen
- Kommentare für komplexe Logik
```

---

## 📋 Prompt 2: Commission Tracker Page

```
Du bist ein Senior React/TypeScript Entwickler. Erstelle eine "Commission Tracker" Page.

KONTEXT:
- Framework: React mit TypeScript
- API: FastAPI Backend auf /api/commissions
- Styling: Tailwind CSS oder CSS Modules

ANFORDERUNGEN:
1. Erstelle: `src/pages/CommissionTrackerPage.tsx`
2. Features:
   - Monatsübersicht (GET /api/commissions?month=YYYY-MM-01)
   - Liste aller Provisionen mit: Deal, Dealwert, Provision %, Betrag, Status
   - Summen: Gesamt-Provision, Netto, Brutto, Steuer
   - Filter: Nach Monat, Status (pending, paid, overdue)
   - Buttons: "PDF Export", "An Buchhaltung senden"
   - Formular: Neue Provision erstellen (POST /api/commissions)

3. API-Struktur:
   - GET /api/commissions → List[Commission]
   - GET /api/commissions/summary?month=YYYY-MM-01 → CommissionSummary
   - POST /api/commissions → Commission
   - GET /api/commissions/{id}/invoice → PDF (Blob)
   - POST /api/commissions/{id}/send-to-accounting → Email

   Commission Schema:
   {
     id: UUID
     deal_id: UUID
     deal_value: number
     commission_rate: number (Prozent)
     commission_amount: number
     net_amount: number
     tax_amount: number
     status: "pending" | "paid" | "overdue"
     commission_month: date
   }

4. Design:
   - Tabelle für Provisionen
   - Monats-Picker
   - Highlighting für overdue
   - PDF-Download Button
   - Formular-Modal für neue Provision

5. Nutze bestehende Patterns:
   - Date-Picker: react-datepicker oder native input[type="month"]
   - PDF-Download: Blob-Response als Download
   - Form-Validation: React Hook Form (wenn vorhanden)

ERSTELLE:
- Vollständigen TypeScript-Code
- Form-Validierung
- Loading-States
- Error-Handling
```

---

## 📋 Prompt 3: Cold Call Assistant Page

```
Du bist ein Senior React/TypeScript Entwickler. Erstelle eine "Cold Call Assistant" Page.

KONTEXT:
- Framework: React mit TypeScript
- API: FastAPI Backend auf /api/cold-call
- Styling: Tailwind CSS oder CSS Modules

ANFORDERUNGEN:
1. Erstelle: `src/pages/ColdCallAssistantPage.tsx`
2. Features:
   - Script-Generator: Kontakt auswählen → Script generieren (POST /api/cold-call/generate-script/{contact_id})
   - Session-Manager: Liste aller Sessions (GET /api/cold-call/sessions)
   - Übungsmodus: Practice-Session starten
   - Einwand-Bibliothek: Dropdown mit Einwänden und Antworten
   - Live-Script während Call: Scrollbare Anleitung

3. API-Struktur:
   - POST /api/cold-call/generate-script/{contact_id}?goal=book_meeting → PersonalizedScript
   - POST /api/cold-call/session → ColdCallSession
   - GET /api/cold-call/sessions → List[ColdCallSession]
   - POST /api/cold-call/session/{id}/start → Session starten
   - POST /api/cold-call/session/{id}/complete → Session abschließen

   PersonalizedScript Schema:
   {
     contact_name: string
     company_name: string
     goal: "book_meeting" | "qualify" | "identify_decision_maker"
     sections: Array<{
       section_type: "opener" | "objection_response" | "close"
       title: string
       script: string
       tips: string[]
     }>
     suggested_objections: string[]
   }

4. Design:
   - Zwei-Spalten-Layout: Links Kontakt-Liste, Rechts Script
   - Script-Sections als kollabierbare Accordions
   - Copy-to-Clipboard für jeden Script-Abschnitt
   - Timer für Call-Dauer
   - Notizen-Feld während Call
   - Übungsmodus: KI spielt Kontakt, User antwortet

5. Interaktivität:
   - Kontakt-Auswahl → Auto-Script-Generierung
   - Einwand-Klick → Zeige passende Antwort
   - Session-Tracking: Start/Stop, Dauer, Notizen

ERSTELLE:
- Vollständigen TypeScript-Code
- State-Management für Session
- Timer-Komponente
- Copy-to-Clipboard Funktionalität
```

---

## 📋 Prompt 4: Performance Insights Dashboard

```
Du bist ein Senior React/TypeScript Entwickler. Erstelle ein "Performance Insights Dashboard".

KONTEXT:
- Framework: React mit TypeScript
- API: FastAPI Backend auf /api/performance-insights
- Charts: Recharts oder Chart.js (wenn vorhanden)

ANFORDERUNGEN:
1. Erstelle: `src/pages/PerformanceInsightsPage.tsx`
2. Features:
   - Period-Auswahl: Monat, Quartal, Jahr
   - Metriken-Vergleich: Aktuell vs. Vorherige Periode
   - Issue-Detection: Erkannte Probleme mit Empfehlungen
   - Charts: Calls, Deals, Conversion über Zeit
   - Coaching-Empfehlungen: AI-generierte Tipps

3. API-Struktur:
   - POST /api/performance-insights/analyze?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD → PerformanceInsight
   - GET /api/performance-insights/my-insights → List[PerformanceInsight]

   PerformanceInsight Schema:
   {
     id: UUID
     period_start: date
     period_end: date
     calls_made: number
     deals_won: number
     conversion_rate: number
     revenue: number
     detected_issues: Array<{
       type: string
       severity: "low" | "medium" | "high"
       metric: string
       recommendation: string
     }>
     recommendations: Array<{
       title: string
       description: string
       action_items: string[]
       expected_impact: string
     }>
   }

4. Design:
   - Dashboard-Layout: KPI-Cards oben, Charts unten
   - Vergleich: Aktuell vs. Vorherige Periode (mit %-Änderung)
   - Issue-Cards: Rot/Gelb/Grün nach Severity
   - Empfehlungen als Action-Items
   - Responsive: Mobile-friendly

5. Visualisierung:
   - Line-Chart: Calls/Deals über Zeit
   - Bar-Chart: Conversion-Rate Vergleich
   - KPI-Cards: Calls, Deals, Revenue, Conversion

ERSTELLE:
- Vollständigen TypeScript-Code
- Chart-Komponenten
- Responsive Design
- Loading-States
```

---

## 📋 Prompt 5: Gamification Dashboard

```
Du bist ein Senior React/TypeScript Entwickler. Erstelle ein "Gamification Dashboard".

KONTEXT:
- Framework: React mit TypeScript
- API: FastAPI Backend auf /api/gamification
- Styling: Tailwind CSS oder CSS Modules

ANFORDERUNGEN:
1. Erstelle: `src/pages/GamificationPage.tsx`
2. Features:
   - Streak-Anzeige: Aktueller Streak, Längster Streak
   - Achievements: Liste aller Achievements (abgeschlossen/offen)
   - Progress-Bars: Fortschritt zu nächstem Achievement
   - Leaderboard: Top-Performer
   - Daily-Activity-Tracking: Heute geschafft

3. API-Struktur:
   - GET /api/gamification/achievements → List[Achievement]
   - GET /api/gamification/daily-activities?days=7 → List[DailyActivity]
   - POST /api/gamification/daily-activities/track → DailyActivity
   - GET /api/gamification/leaderboard → List[LeaderboardEntry]

   Achievement Schema:
   {
     id: UUID
     achievement_name: string
     achievement_icon: string (Emoji)
     progress_current: number
     progress_target: number
     is_completed: boolean
     points_awarded: number
   }

4. Design:
   - Hero-Section: Aktueller Streak groß anzeigen
   - Achievement-Grid: Icons mit Progress-Bars
   - Leaderboard: Tabelle mit Rank, Name, Punkte
   - Daily-Tracker: Checkboxen für heutige Aktivitäten
   - Celebration-Animation: Konfetti bei Achievement-Freischaltung

5. Interaktivität:
   - Achievement-Klick → Zeige Details
   - Daily-Activity-Update → Auto-Streak-Update
   - Leaderboard-Refresh: Auto-Update alle 30 Sekunden

ERSTELLE:
- Vollständigen TypeScript-Code
- Animationen (CSS oder Framer Motion)
- Progress-Bar-Komponente
- Celebration-Effekte
```

---

## 📋 Prompt 6: Routing & Navigation

```
Du bist ein Senior React-Entwickler. Integriere die neuen Pages in die App-Routing-Struktur.

KONTEXT:
- Routing: React Router v6
- Hauptdatei: src/App.jsx
- Navigation: Sidebar oder Top-Nav

ANFORDERUNGEN:
1. Öffne: src/App.jsx
2. Füge Routes hinzu für:
   - /commissions → CommissionTrackerPage
   - /closing-coach → ClosingCoachPage
   - /cold-call → ColdCallAssistantPage
   - /performance → PerformanceInsightsPage
   - /gamification → GamificationPage

3. Navigation:
   - Füge Links in Sidebar/Top-Nav hinzu
   - Icons: 💰 Commissions, 🎯 Closing Coach, 📞 Cold Call, 📈 Performance, 🏆 Gamification
   - Active-State: Highlight aktive Route

4. Protected Routes:
   - Alle neuen Routes sollen Auth-geschützt sein
   - Redirect zu /login wenn nicht eingeloggt

ERSTELLE:
- Route-Definitionen
- Navigation-Links
- Icons/Emojis
```

---

## 🎯 Verwendung

### Für GPT-4:
1. Kopiere einen Prompt
2. Gehe zu ChatGPT
3. Füge den Prompt ein
4. GPT erstellt den Code

### Für Claude (Anthropic):
1. Kopiere einen Prompt
2. Gehe zu claude.ai
3. Füge den Prompt ein
4. Claude erstellt den Code

### Für Gemini:
1. Kopiere einen Prompt
2. Gehe zu gemini.google.com
3. Füge den Prompt ein
4. Gemini erstellt den Code

---

## 💡 Tipps

1. **Ein Prompt = Eine Komponente**: Gib immer nur einen Prompt pro LLM-Session
2. **Code prüfen**: LLM-Code immer testen und anpassen
3. **Patterns befolgen**: LLM sollte bestehende Patterns aus dem Codebase nutzen
4. **Iterativ**: Wenn Code nicht passt, gib Feedback und lass es anpassen

---

## 📝 Beispiel-Prompt für Architektur-Fragen

```
Du bist ein Senior Frontend-Architekt. Analysiere die bestehende React-App und gib Empfehlungen.

KONTEXT:
- Framework: React mit TypeScript
- Routing: React Router
- State: React Hooks
- API: FastAPI Backend

FRAGE:
Wie sollte ich die neuen Features (Closing Coach, Commissions, etc.) in die bestehende App-Architektur integrieren?

Bitte analysiere:
1. Bestehende Patterns (API-Calls, State-Management, Styling)
2. Empfohlene Struktur für neue Pages
3. Wiederverwendbare Komponenten
4. Routing-Strategie
5. State-Management (lokal vs. global)

Gib konkrete Empfehlungen mit Code-Beispielen.
```

---

**Viel Erfolg! 🚀**

