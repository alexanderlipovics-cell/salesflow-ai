# 🎯 SALESFLOW - VOLLSTÄNDIGE SYSTEM-ANALYSE

**Erstellt:** $(date)  
**Version:** 1.0  
**Status:** Produktionsreif

---

## 📋 INHALTSVERZEICHNIS

1. [System-Architektur](#system-architektur)
2. [Frontend Features](#frontend-features)
3. [Backend Services](#backend-services)
4. [AI Prompts & Agents](#ai-prompts--agents)
5. [Datenstrukturen](#datenstrukturen)
6. [MLM Import System](#mlm-import-system)
7. [Verticals & Branchen](#verticals--branchen)
8. [API Endpoints](#api-endpoints)
9. [Komponenten-Übersicht](#komponenten-übersicht)

---

## 🏗️ SYSTEM-ARCHITEKTUR

### Tech Stack
- **Frontend:** React Native (Expo) mit TypeScript
- **Backend:** FastAPI (Python) mit Supabase
- **Database:** PostgreSQL (via Supabase)
- **AI:** OpenAI GPT-4 / Anthropic Claude
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage

### Projektstruktur
```
src/
├── screens/          # 53 Screens (29 TSX, 21 JS, 3 TS)
├── components/       # 50+ wiederverwendbare Komponenten
├── backend/          # FastAPI Backend (365 Python-Dateien)
├── services/         # Frontend Services (27 Dateien)
├── hooks/           # 42 Custom Hooks
├── domain/          # Domain Logic (Goals, Verticals)
├── config/          # Konfigurationen (Verticals, Pricing)
├── navigation/      # React Navigation Setup
└── types/           # TypeScript Type Definitions
```

---

## 🎨 FRONTEND FEATURES

### Haupt-Screens (Main Tabs)

#### 1. **Dashboard** (`DashboardScreen.js`)
- Glassmorphism Design (AURA OS Theme)
- Live Stats (Leads, Follow-ups, Conversion Rate)
- Quick Actions
- Daily Flow Status
- CHIEF Chat Integration
- Autopilot Widget
- Brain Dashboard

#### 2. **DMO Tracker** (`DMOTrackerScreen.tsx`)
- Daily Momentum Optimizer
- Aktivitäts-Tracking
- Streak-System
- Performance-Visualisierung

#### 3. **Kontakte** (`LeadsScreen.js`)
- Lead-Verwaltung mit BANT-Scoring
- DISG-Persönlichkeitstypen
- Lead-Scoring (0-100)
- Status-Management (Neu, Kontaktiert, Qualifiziert, etc.)
- Filter & Sortierung
- Chat Import Modal
- Next Step Widget

#### 4. **MENTOR Chat** (`ChatScreen.js`)
- CHIEF AI Agent Integration
- Kontext-basierte Antworten
- Voice Input/Output
- Action Tags für Frontend-Interaktionen
- Skill-Level Anpassung (Rookie/Advanced/Pro)

#### 5. **Team** (`TeamPerformanceScreen.js`)
- Team-Dashboard
- Performance-Metriken
- Team-Struktur (MLM)
- Leaderboard

### Weitere Screens

#### Daily Flow System
- `DailyFlowScreen.js` - Tagesziele & Aktivitäten
- `DailyFlowSetupScreen.js` - Konfiguration
- `DailyFlowStatusScreen.js` - Status-Übersicht
- `GuidedDailyFlowScreen.tsx` - Geführter Flow

#### AI & Intelligence
- `BrainScreen.tsx` - Autonome AI Agenten
- `ObjectionBrainScreen.js` - Einwandbehandlung
- `NextBestActionsScreen.js` - AI-Empfehlungen
- `AuraOsDashboardScreen.tsx` - Premium Dashboard

#### Import & Daten
- `ImportContactsScreen.tsx` - MLM CSV Import
- `DataImportScreen.tsx` - Generic CSV Import
- `ChatImportModal.tsx` - Chat-basierter Import

#### Sequencer Engine
- `SequencesListScreen.tsx` - Sequenz-Übersicht
- `SequenceBuilderScreen.tsx` - Sequenz-Editor
- `SequenceAnalyticsScreen.tsx` - Analytics
- `SequenceTemplatesScreen.tsx` - Templates
- `EmailAccountsScreen.tsx` - E-Mail-Accounts

#### Autopilot
- `AutopilotSettingsScreen.js` - Einstellungen
- `AutopilotDraftsScreen.js` - Entwürfe

#### Reactivation Agent
- `ReactivationScreen.tsx` - Reaktivierungs-Agent
- `ReviewQueueScreen.tsx` - Review-Queue

#### CHIEF v3.0 Module
- `GhostBusterScreen.tsx` - Ghosting-Prävention
- `TeamLeaderScreen.tsx` - Team-Leader Tools
- `PhoenixScreen.tsx` - Phoenix-Modul

#### Analytics & Intelligence
- `AnalyticsDashboardScreen.js` - Analytics
- `TemplateAnalyticsScreen.js` - Template-Analytics
- `FinanceOverviewScreen.js` - Finanz-Übersicht

#### Outreach
- `OutreachScreen.js` - Outreach-Tracker
- `FollowUpsScreen.js` - Follow-up-Verwaltung
- `ProposalRemindersScreen.js` - Angebots-Erinnerungen

#### Playbooks
- `PlaybooksScreen.js` - Sales Playbooks
- Kategorien: Opener, Follow-up, Closing, Einwände

#### Settings & Admin
- `SettingsScreen.tsx` - Einstellungen
- `PricingScreen.tsx` - Pricing
- `SecurityDashboard.tsx` - Security
- `ComplianceReport.tsx` - Compliance
- `ABTestDashboard.tsx` - A/B Testing

---

## ⚙️ BACKEND SERVICES

### Core Services

#### 1. **AI Services** (`services/ai/`)
- `ai_service.py` - Zentrale AI-Integration (OpenAI/Anthropic)
- `ai_logger.py` - AI-Call Logging

#### 2. **MENTOR System** (`services/mentor/`)
- `service.py` - MENTOR AI Service
- `prompts.py` - System Prompts
- `context_builder.py` - Kontext-Aufbau
- `learning.py` - Learning System

#### 3. **CHIEF v3.1** (`api/routes/chief_v31.py`)
- Multi-Mode Router (Coach, Analyst, Driver, etc.)
- Skill-Level Anpassung
- Vertical-spezifische Anpassung

#### 4. **Live Assist** (`services/live_assist/`)
- Real-time Coaching während Gesprächen
- DISC-Profile Integration
- Compliance-Checks
- 9 Service-Module

#### 5. **CSV Import** (`services/csv_import/`)
- MLM-spezifische Parser (Zinzino, PM-International, etc.)
- Auto-Mapping mit GPT
- Duplikat-Erkennung
- Field Mapping

#### 6. **Daily Flow** (`services/daily_flow_actions.py`)
- Tagesziel-Tracking
- Aktivitäts-Logging
- Streak-System

#### 7. **Sequencer Engine** (`services/sequencer/`)
- E-Mail-Sequenzen
- Multi-Channel (Email, WhatsApp, LinkedIn)
- A/B Testing
- Analytics

#### 8. **Reactivation Agent** (`agents/reactivation/`)
- LangGraph-basierter Agent
- Automatische Reaktivierung
- Review-Queue

#### 9. **Sales Intelligence** (`services/sales_intelligence.py`)
- Buyer Psychology
- Behavioral Analysis
- Framework Selector

#### 10. **Knowledge System** (`services/knowledge/`)
- Knowledge Base Upload
- RAG (Retrieval Augmented Generation)
- Evidence Hub

#### 11. **Learning System** (`services/learning/`)
- Event-basiertes Lernen
- Pattern Recognition
- Skill-Entwicklung

#### 12. **Autopilot** (`services/autopilot/`)
- Automatische Nachrichten
- Draft-Generierung
- Review-System

#### 13. **Phoenix** (`services/phoenix/`)
- Deal Health Tracking
- Revenue Engineering
- Killer Phrases

#### 14. **Storybook** (`services/storybook/`)
- Brand Story Management
- Compliance-Checks
- Analytics

#### 15. **Finance** (`services/finance/`)
- Einkommen-Tracking
- Tax Prep
- Compensation Plans

#### 16. **Gamification** (`services/gamification/`)
- Points & Badges
- Leaderboards
- Achievements

#### 17. **Pulse Tracker** (`services/pulse_tracker/`)
- Team-Pulse
- Check-ins
- Ghost Buster

---

## 🤖 AI PROMPTS & AGENTS

### Haupt-Prompts

#### 1. **CHIEF System Prompt** (`config/prompts/chief_prompt.py`)
- Basis-Persönlichkeit: Sales-Mentor, motivierend, direkt
- Skill-Levels: Rookie, Advanced, Pro
- Action Tags für Frontend-Integration
- Vertical-Anpassung

#### 2. **MENTOR Prompts** (`services/mentor/prompts.py`)
- System Prompt für CHIEF
- Kontext-Template
- DISC-Anpassung
- Liability Shield Keywords
- Motivation & Celebration Prompts

#### 3. **CHIEF v3.1 Module** (`config/prompts/chief_v31_additions.py`)
- Multi-Mode System
- Coach Mode
- Analyst Mode
- Driver Mode
- Team Leader Mode
- Customer Retention Mode

#### 4. **Live Assist Prompt v3** (`config/prompts/live_assist_prompt_v3.py`)
- Real-time Coaching
- DISC-Integration
- Compliance-Checks

#### 5. **Weitere Spezial-Prompts** (34 Dateien in `config/prompts/`)
- `chief_autopilot.py` - Autopilot-Modus
- `chief_ghost_buster.py` - Ghosting-Prävention
- `chief_phoenix.py` - Phoenix-Modul
- `chief_sales_frameworks.py` - Sales Frameworks
- `chief_buyer_psychology.py` - Buyer Psychology
- `chief_evidence.py` - Evidence Hub
- `chief_knowledge.py` - Knowledge System
- `chief_workflow.py` - Workflow-Optimierung
- `chief_tax_coach.py` - Tax Coaching
- `chief_multilang.py` - Multi-Language Support
- `liability_shield.py` - Compliance & Safety
- `locked_block.py` - Sicherheits-Blocker

### AI Agents

#### 1. **CHIEF (MENTOR)**
- Persönlicher Sales-Coach
- Kontext-basierte Antworten
- Skill-Level Anpassung
- Vertical-spezifisch

#### 2. **Reactivation Agent** (LangGraph)
- Automatische Reaktivierung
- Multi-Step Workflow
- Review-Queue

#### 3. **Autopilot Agent**
- Automatische Nachrichten
- Draft-Generierung
- Review-System

#### 4. **Brain Dashboard**
- Autonome Agenten
- Task-Automation
- Decision-Making

---

## 📊 DATENSTRUKTUREN

### Haupt-Tabellen (Supabase)

#### User & Auth
- `users` - Supabase Auth
- `profiles` - User-Profile
- `companies` - Firmen/Teams

#### Contacts & Leads
- `contacts` - Kontakte (mit MLM-Feldern)
- `leads` - Leads mit Scoring
- `lead_scores` - BANT-Scoring
- `personality_profiles` - DISG-Profile

#### Daily Flow
- `daily_flow_targets` - Tagesziele
- `daily_flow_activities` - Aktivitäten
- `daily_flow_status` - Status-Tracking

#### Goals & Verticals
- `goals` - Ziele
- `goal_breakdowns` - Ziel-Aufschlüsselung
- `user_verticals` - User-Vertical-Zuordnung
- `compensation_plans` - MLM Compensation Plans

#### MLM Import
- `mlm_imports` - Import-Logs
- `mlm_import_batches` - Batch-Tracking

#### Sequences
- `sequences` - E-Mail-Sequenzen
- `sequence_steps` - Sequenz-Schritte
- `sequence_analytics` - Analytics
- `email_accounts` - E-Mail-Accounts

#### Live Assist
- `live_assist_sessions` - Sessions
- `live_assist_responses` - Antworten
- `disc_profiles` - DISC-Profile

#### Knowledge & Learning
- `knowledge_base` - Knowledge Base
- `learning_events` - Learning Events
- `evidence_hub` - Evidence Hub

#### Sales Intelligence
- `buyer_profiles` - Buyer Profiles
- `behavioral_patterns` - Verhaltensmuster
- `sales_frameworks` - Sales Frameworks

#### Finance
- `income_records` - Einkommen
- `tax_prep_data` - Tax Prep
- `compensation_calculations` - Compensation

#### Gamification
- `user_points` - Points
- `badges` - Badges
- `achievements` - Achievements

#### Reactivation
- `reactivation_campaigns` - Kampagnen
- `reactivation_actions` - Aktionen
- `review_queue` - Review-Queue

#### Autopilot
- `autopilot_drafts` - Entwürfe
- `autopilot_settings` - Einstellungen

#### Phoenix
- `deal_health` - Deal Health
- `revenue_engineering` - Revenue Engineering

#### Storybook
- `brand_stories` - Brand Stories
- `story_analytics` - Analytics

### Type Definitions

#### Frontend Types (`types/`, `domain/goals/types.ts`)
- `GoalInput` - Ziel-Eingabe
- `GoalBreakdown` - Ziel-Aufschlüsselung
- `DailyFlowConfig` - Daily Flow Config
- `VerticalId` - Vertical IDs
- `KpiDefinition` - KPI Definitionen

#### Vertical Types (`config/verticals/types.ts`)
- `VerticalConfig` - Vertical-Konfiguration
- `VerticalActivityType` - Aktivitätstypen
- `VerticalGoalType` - Zieltypen
- `ObjectionContext` - Einwand-Kontext

---

## 📥 MLM IMPORT SYSTEM

### Unterstützte MLM-Unternehmen

1. **Zinzino** (`zinzino`)
   - Partner ID, Vorname, Nachname, Email, Telefon
   - Rang, Credits, Team Credits, PCP
   - Sponsor ID, Z4F Status, ECB Status
   - 18 Rang-Levels (Partner bis President)

2. **PM-International (FitLine)** (`pm-international`) ⭐ NEU
   - Partner-Nr, Vorname, Nachname, Email, Telefon
   - Rang, Punkte (P), GV, Erstlinie
   - Sponsor, Autoship
   - 12 Rang-Levels (Teampartner bis Champions League)
   - Punkte-zu-Euro: 1 P ≈ 0,51€
   - Auto-Bonus Qualifikation (ab IMM)

3. **doTERRA** (`doterra`)
   - Vorname, Nachname, Email, Telefon
   - Rank, OV

4. **Herbalife** (`herbalife`)
   - Name, ID, Sponsor, Level, VP, PP

5. **LR** (`lr`)
   - Ähnlich Herbalife

6. **Vorwerk** (`vorwerk`)
   - Ähnlich PM-International

7. **Generic MLM** (`generic`)
   - Automatische Spalten-Erkennung mit GPT

### Parser Features
- Automatisches Field Mapping
- GPT-basierte Spalten-Erkennung
- Duplikat-Erkennung
- Rang-Normalisierung
- Volumen-Berechnungen
- Sync-Modi (Once, Weekly)

---

## 🏢 VERTICALS & BRANCHEN

### Unterstützte Verticals

1. **Network Marketing** (`network_marketing`)
   - MLM-spezifische Features
   - Team-Struktur
   - Compensation Plans
   - Rang-System

2. **Real Estate** (`real_estate`)
   - Immobilien-spezifisch
   - Objekte, Besichtigungen
   - Makleraufträge

3. **Finance** (`finance`)
   - Finanzvertrieb
   - Policen, Beratungsgespräche
   - Prämien

4. **Coaching** (`coaching`)
   - Coaching/Beratung
   - Programme, Sessions
   - Buchungen

5. **Insurance** (`insurance`)
   - Versicherungen

6. **B2B SaaS** (`b2b_saas`)
   - B2B Software

7. **Custom** (`custom`)
   - Individuelle Anpassung

### Vertical Features
- Vertical-spezifische KPIs
- Aktivitätstypen
- Zieltypen
- Einwand-Kontexte
- Daily Flow Defaults
- Playbook Templates

---

## 🔌 API ENDPOINTS

### Haupt-Routen (`api/routes/`)

#### MENTOR & CHIEF
- `POST /api/v2/mentor/chat` - CHIEF Chat
- `POST /api/v2/mentor/quick-action` - Quick Actions
- `GET /api/v2/mentor/context` - Kontext

#### Daily Flow
- `GET /api/v2/daily-flow/status` - Status
- `POST /api/v2/daily-flow/activities` - Aktivitäten
- `GET /api/v2/daily-flow/targets` - Ziele

#### Goals
- `POST /api/v2/goals/breakdown` - Ziel-Aufschlüsselung
- `GET /api/v2/goals` - Ziele

#### MLM Import
- `POST /api/v1/mlm-import/preview` - Preview
- `POST /api/v1/mlm-import/execute` - Import
- `GET /api/v1/mlm-import/companies` - Unternehmen

#### Contacts
- `GET /api/v2/contacts` - Kontakte
- `POST /api/v2/contacts` - Neuer Kontakt

#### Sequences
- `GET /api/v2/sequences` - Sequenzen
- `POST /api/v2/sequences` - Neue Sequenz
- `GET /api/v2/sequences/{id}/analytics` - Analytics

#### Live Assist
- `POST /api/v2/live-assist/analyze` - Analyse
- `GET /api/v2/live-assist/sessions` - Sessions

#### Reactivation
- `POST /api/v2/reactivation/start` - Start
- `GET /api/v2/reactivation/campaigns` - Kampagnen

#### Autopilot
- `POST /api/v2/autopilot/generate` - Generieren
- `GET /api/v2/autopilot/drafts` - Entwürfe

#### Knowledge
- `POST /api/v2/knowledge/upload` - Upload
- `GET /api/v2/knowledge/search` - Suche

#### Learning
- `GET /api/v2/learning/events` - Events
- `POST /api/v2/learning/aggregate` - Aggregieren

#### Finance
- `GET /api/v2/finance/overview` - Übersicht
- `POST /api/v2/finance/income` - Einkommen

#### Analytics
- `GET /api/v2/analytics/dashboard` - Dashboard
- `GET /api/v2/analytics/templates` - Templates

#### Verticals
- `GET /api/v2/verticals` - Verticals
- `GET /api/v2/verticals/{id}/config` - Config

---

## 🧩 KOMPONENTEN-ÜBERSICHT

### AURA OS Components (`components/aura/`)
- `GlassCard.tsx` - Glassmorphism Card
- `AuraLogo.tsx` - Logo
- `AuraToast.tsx` - Toast Notifications
- `AuraSplashScreen.tsx` - Splash Screen
- Theme System (`theme.ts`)

### CHIEF Components
- `chief-v31/` - CHIEF v3.1 Integration
- `chief-v3/` - CHIEF v3.0 Components

### Live Assist (`components/live-assist/`)
- `CoachOverlay.tsx` - Coaching Overlay
- `DISCVisualization.tsx` - DISC-Visualisierung
- `LiveAssistResponse.tsx` - Antworten

### Daily Flow (`components/daily-flow/`)
- `DailyFlowStatusCard.js` - Status Card
- `DailyProgressBar.js` - Progress Bar
- `QuickActivityButtons.js` - Quick Actions

### Goal Wizard (`components/goal-wizard/`)
- `StepCompanySelect.tsx` - Firmen-Auswahl
- `StepGoalDefine.tsx` - Ziel-Definition
- `StepPlanSummary.tsx` - Plan-Zusammenfassung

### Autopilot (`components/autopilot/`)
- `AutopilotWidget.tsx` - Widget
- `AutopilotSetupChecklist.tsx` - Setup

### Brain (`components/brain/`)
- `BrainDashboard.tsx` - Dashboard
- `AgentActions.tsx` - Agent-Aktionen

### Phoenix (`components/phoenix/`)
- `PhoenixMapView.tsx` - Map View
- `PhoenixModal.tsx` - Modal

### Sales Intelligence (`components/sales-intelligence/`)
- `BuyerTypeBadge.tsx` - Buyer Type
- `FrameworkSelector.tsx` - Framework
- `LanguageSelector.tsx` - Sprache

### Storybook (`components/storybook/`)
- `StoryBrowser.tsx` - Browser
- `StoryCard.tsx` - Card
- `ComplianceChecker.tsx` - Compliance

### Voice (`components/voice/`)
- `VoiceButton.tsx` - Voice Input
- `VoiceSettingsPanel.tsx` - Settings

### UI Components (`components/ui/`)
- `Toast.tsx` - Toast
- `Skeleton.tsx` - Loading Skeleton
- `LanguageSwitcher.tsx` - Sprache
- `USPBadges.tsx` - USP Badges

---

## 📈 STATISTIKEN

### Code-Basis
- **Frontend Screens:** 53
- **Backend Services:** 50+
- **API Routes:** 40+
- **Komponenten:** 50+
- **Hooks:** 42
- **Prompts:** 34
- **Migrations:** 93 SQL-Dateien

### Features
- **MLM-Unternehmen:** 7 (inkl. Generic)
- **Verticals:** 7
- **AI Agents:** 4
- **Import-Formate:** 7

---

## 🔐 SICHERHEIT & COMPLIANCE

### Liability Shield
- Keyword-Filterung
- Compliance-Checks
- Locked Blocks

### RLS (Row Level Security)
- User-basierte Zugriffskontrolle
- Company-basierte Isolation
- Feature-basierte Permissions

---

## 🚀 DEPLOYMENT

### Backend
- FastAPI auf Python 3.11+
- Supabase Integration
- Environment Variables

### Frontend
- React Native (Expo)
- TypeScript
- i18n Support (DE/EN)

---

## 📝 NOTIZEN

- System ist produktionsreif
- Umfangreiche Dokumentation vorhanden
- Regelmäßige Updates
- Multi-Vertical Support
- Erweiterte AI-Integration

---

**Ende der Analyse**

