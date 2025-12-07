# 🤖 LLM-Prompts für fehlende Features

Diese Prompts sind für die **3 noch offenen Features**:

1. **Smart Route Planner** - Route-Optimierung für Außendienst
2. **AI Lead Qualifier** - LinkedIn-Integration, BANT-Scoring
3. **Lead Discovery Engine** - Multi-Source Lead-Suche

---

## 📋 Prompt 1: Smart Route Planner (Backend + Frontend)

### Backend (FastAPI)

```
Du bist ein Senior Python/FastAPI Entwickler. Erstelle einen Router für "Smart Route Planner".

KONTEXT:
- Framework: FastAPI
- Datenbank: Supabase (PostgreSQL)
- API: RESTful Endpoints
- Integration: Google Maps API (optional, später)

ANFORDERUNGEN:
1. Erstelle: `backend/app/routers/route_planner.py`
2. Features:
   - Route-Optimierung basierend auf Geo-Location
   - Termine nach optimaler Reihenfolge sortieren
   - Fahrzeit-Berechnung
   - "Leads auf der Route" vorschlagen
   - Export zu Google Maps / Apple Maps

3. API-Endpoints:
   - POST /api/route-planner/optimize
     Body: {
       appointments: [
         { id: string, contact_id: string, address: string, lat: float, lng: float, duration_minutes: int }
       ],
       start_location: { lat: float, lng: float },
       constraints: { max_driving_time: int, start_time: string }
     }
     Response: {
       optimized_route: [
         { appointment_id: string, order: int, estimated_arrival: string, driving_time_minutes: int }
       ],
       total_driving_time: int,
       leads_on_route: [
         { lead_id: string, distance_from_route: float, reason: string }
       ]
     }
   
   - GET /api/route-planner/routes?user_id=... → List[RoutePlan]
   - POST /api/route-planner/routes → RoutePlan
   - GET /api/route-planner/routes/{id} → RoutePlan
   - DELETE /api/route-planner/routes/{id}

4. Datenbank:
   - Nutze bestehende Tabelle: `route_plans` (aus Migration)
   - Schema:
     - id, user_id, name, date, appointments (JSONB), optimized_order (JSONB), total_driving_time, created_at

5. Algorithmus:
   - Einfache Nearest-Neighbor-Heuristik (für MVP)
   - Später: Google Maps Directions API für echte Route-Optimierung
   - Berechne Distanz zwischen Terminen (Haversine-Formel)

6. Integration:
   - Nutze `app.ai_client` für KI-Empfehlungen ("Leads auf der Route")
   - Nutze bestehende `contacts` Tabelle für Lead-Vorschläge

ERSTELLE:
- Vollständigen FastAPI Router
- Route-Optimierungs-Logik
- Error-Handling
- API-Dokumentation
```

### Frontend (React Web)

```
Du bist ein Senior React/TypeScript Entwickler. Erstelle eine Page für "Smart Route Planner".

KONTEXT:
- Framework: React + TypeScript
- Routing: React Router
- Maps: Google Maps API (optional) oder einfache Visualisierung
- Styling: Tailwind CSS
- API: FastAPI Backend auf /api/route-planner

ANFORDERUNGEN:
1. Erstelle: `src/pages/RoutePlannerPage.tsx`
2. Features:
   - Termin-Liste anzeigen
   - "Route optimieren" Button
   - Optimierte Route anzeigen (Liste + Karte)
   - Fahrzeit-Anzeige
   - "Leads auf der Route" Vorschläge
   - Export zu Google Maps / Apple Maps
   - Route speichern & laden

3. Design:
   - Zwei-Spalten-Layout: Liste links, Karte rechts (oder Mobile: Tabs)
   - Termin-Cards mit Drag & Drop (Reihenfolge ändern)
   - Karte: Zeige Route als Linie (oder einfache Visualisierung)
   - Summary: Gesamtfahrzeit, Anzahl Termine

4. API-Integration:
   - POST /api/route-planner/optimize → Optimierte Route
   - GET /api/route-planner/routes → Gespeicherte Routen
   - POST /api/route-planner/routes → Route speichern

5. Mobile-optimiert:
   - Responsive Design
   - Touch-Gesten für Drag & Drop
   - Karte auf Mobile: Fullscreen-Modus

ERSTELLE:
- Vollständigen React Code
- Google Maps Integration (optional)
- Drag & Drop für Termine
- Mobile-optimierte UI
```

---

## 📋 Prompt 2: AI Lead Qualifier (Backend + Frontend)

### Backend (FastAPI)

```
Du bist ein Senior Python/FastAPI Entwickler. Erstelle einen Router für "AI Lead Qualifier".

KONTEXT:
- Framework: FastAPI
- Datenbank: Supabase (PostgreSQL)
- LLM: Nutze `app.ai_client` für Analyse
- Integration: LinkedIn API (optional, später)

ANFORDERUNGEN:
1. Erstelle: `backend/app/routers/lead_qualifier.py`
2. Features:
   - LinkedIn-Profil analysieren (Position, Firma, Größe)
   - Firma recherchieren (Größe, Branche, News)
   - Kaufsignale erkennen
   - BANT-Score berechnen (Budget, Authority, Need, Timeline)
   - Priorisierung: "Ruf DIESEN Lead zuerst an"

3. API-Endpoints:
   - POST /api/lead-qualifier/analyze
     Body: {
       lead_id: string,
       email?: string,
       linkedin_url?: string,
       company_name?: string
     }
     Response: {
       lead_id: string,
       bant_score: number (0-100),
       bant_breakdown: {
         budget: number,
         authority: number,
         need: number,
         timeline: number
       },
       linkedin_data: {
         position: string,
         company: string,
         company_size: string,
         industry: string
       },
       purchase_signals: [
         { type: string, confidence: number, context: string }
       ],
       qualification_recommendation: {
         priority: "high" | "medium" | "low",
         reason: string,
         suggested_questions: [string]
       }
     }
   
   - GET /api/lead-qualifier/qualify/{lead_id} → Qualifizierungs-Daten
   - POST /api/lead-qualifier/batch-qualify → Mehrere Leads auf einmal

4. Datenbank:
   - Nutze bestehende Tabelle: `lead_enrichments` (aus Migration)
   - Spalten: bant_score, bant_budget_score, bant_authority_score, bant_need_score, bant_timeline_score, bant_analysis (JSONB), linkedin_profile_data (JSONB), purchase_signals (JSONB)

5. LLM-Prompt:
   - Nutze `app.ai_client.chat_completion()` für Analyse
   - Prompt: "Analysiere diesen Lead und berechne BANT-Score. Erkenne Kaufsignale."
   - Output: JSON mit BANT-Scores und Empfehlungen

6. LinkedIn-Integration (optional):
   - Nutze LinkedIn API oder Web Scraping (später)
   - Für MVP: Nutze vorhandene Daten aus `lead_enrichments`

ERSTELLE:
- Vollständigen FastAPI Router
- LLM-Integration für Qualifizierung
- BANT-Score-Berechnung
- Error-Handling
```

### Frontend (React Web)

```
Du bist ein Senior React/TypeScript Entwickler. Erstelle eine Page für "AI Lead Qualifier".

KONTEXT:
- Framework: React + TypeScript
- Routing: React Router
- Styling: Tailwind CSS
- API: FastAPI Backend auf /api/lead-qualifier

ANFORDERUNGEN:
1. Erstelle: `src/pages/LeadQualifierPage.tsx`
2. Features:
   - Lead-Liste mit Qualifizierungs-Status
   - "Qualifizieren" Button pro Lead
   - BANT-Score-Anzeige (0-100) mit Breakdown
   - LinkedIn-Daten anzeigen
   - Kaufsignale anzeigen
   - Priorisierung: "Ruf DIESEN Lead zuerst an"
   - Batch-Qualifizierung (mehrere Leads auf einmal)

3. Design:
   - Lead-Cards mit Score-Badge (farbcodiert)
   - Expandable Cards: Tap to expand → Zeige BANT-Breakdown, LinkedIn-Daten, Signale
   - Filter: Nach Score, Priority, Status
   - Sortierung: Nach Score (höchste zuerst)

4. BANT-Visualisierung:
   - 4 Progress-Bars: Budget, Authority, Need, Timeline
   - Gesamt-Score: Große Zahl mit Farbe (Rot/Gelb/Grün)
   - Breakdown-Tooltip: Details zu jedem BANT-Faktor

5. API-Integration:
   - POST /api/lead-qualifier/analyze → Lead qualifizieren
   - GET /api/lead-qualifier/qualify/{lead_id} → Qualifizierungs-Daten
   - POST /api/lead-qualifier/batch-qualify → Batch-Qualifizierung

ERSTELLE:
- Vollständigen React Code
- BANT-Score-Visualisierung
- Expandable Cards
- Mobile-optimierte UI
```

---

## 📋 Prompt 3: Lead Discovery Engine (Backend + Frontend)

### Backend (FastAPI)

```
Du bist ein Senior Python/FastAPI Entwickler. Erstelle einen Router für "Lead Discovery Engine".

KONTEXT:
- Framework: FastAPI
- Datenbank: Supabase (PostgreSQL)
- Integration: LinkedIn Sales Navigator, Google Maps, Branchen-Verzeichnisse

ANFORDERUNGEN:
1. Erstelle: `backend/app/routers/lead_discovery.py`
2. Features:
   - Reaktivierung: Alte Kontakte finden, die lange nicht kontaktiert wurden
   - LinkedIn-Suche: Nach Kriterien suchen, importieren
   - Google Maps Scraping: Lokale Businesses in der Nähe
   - Branchen-Verzeichnisse: WLW, Kompass, etc.
   - Referral-Vorschläge: "Frag Kunde X nach Empfehlungen"

3. API-Endpoints:
   - POST /api/lead-discovery/search
     Body: {
       source: "reactivation" | "linkedin" | "google_maps" | "directory" | "referrals",
       filters: {
         industry?: string,
         region?: string,
         company_size?: string,
         radius_km?: number,
         last_contact_days?: number
       }
     }
     Response: {
       leads: [
         {
           id: string,
           name: string,
           company: string,
           email?: string,
           phone?: string,
           source: string,
           score: number,
           reason: string
         }
       ],
       total: number
     }
   
   - POST /api/lead-discovery/import
     Body: {
       lead_ids: [string],
       source: string
     }
     Response: {
       imported: number,
       skipped: number,
       errors: [string]
     }
   
   - GET /api/lead-discovery/sources → List[Source]
   - GET /api/lead-discovery/referrals?contact_id=... → List[Referral]

4. Datenbank:
   - Nutze bestehende `contacts` Tabelle
   - Spalte `source` für Lead-Herkunft
   - Spalte `discovered_at` für Discovery-Zeitpunkt

5. Reaktivierung-Logik:
   - Finde Kontakte mit `last_contact` > 90 Tage
   - Sortiere nach Score oder Relevanz
   - Gib Grund zurück: "Nicht kontaktiert seit X Tagen"

6. LinkedIn-Integration (optional):
   - Nutze LinkedIn Sales Navigator API (später)
   - Für MVP: Nutze vorhandene LinkedIn-Daten aus `lead_enrichments`

7. Google Maps (optional):
   - Nutze Google Places API (später)
   - Für MVP: Mock-Daten oder einfache Suche

ERSTELLE:
- Vollständigen FastAPI Router
- Multi-Source-Suche
- Import-Funktionalität
- Error-Handling
```

### Frontend (React Web)

```
Du bist ein Senior React/TypeScript Entwickler. Erstelle eine Page für "Lead Discovery Engine".

KONTEXT:
- Framework: React + TypeScript
- Routing: React Router
- Styling: Tailwind CSS
- API: FastAPI Backend auf /api/lead-discovery

ANFORDERUNGEN:
1. Erstelle: `src/pages/LeadDiscoveryPage.tsx`
2. Features:
   - Source-Auswahl: Reaktivierung, LinkedIn, Google Maps, Verzeichnisse, Referrals
   - Filter-UI: Branche, Region, Firmengröße, Radius
   - Suche starten
   - Ergebnisse anzeigen (Liste mit Score)
   - Import-Funktion (einzeln oder Batch)
   - Preview vor Import

3. Design:
   - Wizard-ähnlicher Flow:
     1. Source wählen
     2. Filter setzen
     3. Suche starten
     4. Ergebnisse prüfen
     5. Importieren
   - Ergebnis-Cards: Name, Firma, Score, Source, Grund
   - Checkboxen für Batch-Import
   - "Alle importieren" Button

4. Source-spezifische UI:
   - Reaktivierung: Zeige "Nicht kontaktiert seit X Tagen"
   - LinkedIn: Zeige LinkedIn-Profil-Link
   - Google Maps: Zeige Adresse + Karte
   - Referrals: Zeige "Empfohlen von X"

5. API-Integration:
   - POST /api/lead-discovery/search → Suche starten
   - POST /api/lead-discovery/import → Leads importieren
   - GET /api/lead-discovery/sources → Verfügbare Sources

ERSTELLE:
- Vollständigen React Code
- Wizard-Flow
- Filter-UI
- Batch-Import
- Mobile-optimierte UI
```

---

## 📋 Prompt 4: Mobile Screens für fehlende Features

### Route Planner Mobile Screen

```
Du bist ein Senior React Native Entwickler. Erstelle einen Mobile Screen für "Route Planner".

KONTEXT:
- Framework: React Native
- Navigation: React Navigation
- API: FastAPI Backend auf /api/route-planner
- Maps: react-native-maps (optional)

ANFORDERUNGEN:
1. Erstelle: `src/screens/main/RoutePlannerScreen.js`
2. Features:
   - Termin-Liste anzeigen
   - "Route optimieren" Button
   - Optimierte Route anzeigen (Liste)
   - Fahrzeit-Anzeige
   - "Leads auf der Route" Vorschläge
   - Route speichern & laden

3. Design:
   - Tab-Navigation: "Termine", "Route", "Leads"
   - Termin-Liste: FlatList mit Checkboxen
   - Route-Ansicht: Optimierte Reihenfolge mit Fahrzeiten
   - Karte: Zeige Route (optional, mit react-native-maps)

ERSTELLE:
- Vollständigen React Native Code
- Mobile-optimierte UI
```

### Lead Qualifier Mobile Screen

```
Du bist ein Senior React Native Entwickler. Erstelle einen Mobile Screen für "AI Lead Qualifier".

KONTEXT:
- Framework: React Native
- Navigation: React Navigation
- API: FastAPI Backend auf /api/lead-qualifier

ANFORDERUNGEN:
1. Erstelle: `src/screens/main/LeadQualifierScreen.js`
2. Features:
   - Lead-Liste mit Qualifizierungs-Status
   - "Qualifizieren" Button pro Lead
   - BANT-Score-Anzeige (0-100) mit Breakdown
   - LinkedIn-Daten anzeigen
   - Kaufsignale anzeigen

3. Design:
   - Lead-Cards mit Score-Badge
   - Expandable Cards: Tap to expand → Zeige BANT-Breakdown
   - Filter: Nach Score, Priority

ERSTELLE:
- Vollständigen React Native Code
- Mobile-optimierte UI
```

### Lead Discovery Mobile Screen

```
Du bist ein Senior React Native Entwickler. Erstelle einen Mobile Screen für "Lead Discovery Engine".

KONTEXT:
- Framework: React Native
- Navigation: React Navigation
- API: FastAPI Backend auf /api/lead-discovery

ANFORDERUNGEN:
1. Erstelle: `src/screens/main/LeadDiscoveryScreen.js`
2. Features:
   - Source-Auswahl (Buttons)
   - Filter-UI
   - Suche starten
   - Ergebnisse anzeigen
   - Import-Funktion

3. Design:
   - Wizard-Flow (Step-by-Step)
   - Ergebnis-Liste: FlatList
   - Checkboxen für Batch-Import

ERSTELLE:
- Vollständigen React Native Code
- Mobile-optimierte UI
```

---

## 🎯 Verwendung

1. **Backend zuerst**: Erstelle die Router (FastAPI)
2. **Frontend Web**: Erstelle die Pages (React)
3. **Mobile App**: Erstelle die Screens (React Native)
4. **Integration**: Füge Routes zur Navigation hinzu

---

**Viel Erfolg! 🚀**

