# 🤖 AI DREAM TEAM - Prompts & Aufgaben

**Ihr Elite AI-Team für SalesFlow AI**

---

## 👥 TEAM ROSTER

| Model | Rolle | Stärken | Aufgaben |
|-------|-------|---------|----------|
| **GPT-5.1 Thinking** | Chief Architect | Reasoning, Planning, Complex Logic | Architecture, AI Integration, Complex Features |
| **Claude Opus 4.5** | Senior Developer | Code Quality, Refactoring, Security | Backend Development, Code Reviews, Security |
| **Gemini 3 Ultra** | Full-Stack Dev | Speed, Multimodal, Testing | Frontend Development, Testing, Documentation |

---

## 🎯 AUFGABENVERTEILUNG

### **GPT-5.1 Thinking** - Chief Architect (30% der Arbeit)
```
Fokus: Komplexe Logik, System-Design, Reasoning

✅ System Architecture Decisions
✅ Autopilot Engine Logik
✅ Collective Intelligence System
✅ AI Integration (OpenAI/Anthropic APIs)
✅ Complex Business Logic
✅ Database Schema Design
✅ Performance Optimization Strategy
✅ Security Architecture
```

### **Claude Opus 4.5** - Senior Backend Developer (40% der Arbeit)
```
Fokus: Production-Quality Backend Code

✅ FastAPI Backend Development
✅ Database Queries & Optimization
✅ API Endpoints (REST)
✅ Authentication & Authorization
✅ Error Handling
✅ Code Refactoring
✅ Security Implementation
✅ Backend Testing
```

### **Gemini 3 Ultra** - Full-Stack & Testing (30% der Arbeit)
```
Fokus: Frontend + Testing + Multimodal

✅ React Components Development
✅ UI/UX Implementation
✅ Frontend State Management
✅ E2E Testing (Cypress)
✅ Visual Testing (Screenshots)
✅ Documentation (with Images)
✅ Bug Analysis (Multimodal)
✅ Performance Testing
```

---

## 📋 KONKRETE PROMPTS

---

## 🧠 GPT-5.1 THINKING PROMPTS

### PROMPT 1: System Architecture Review
```
KONTEXT:
Du bist Chief Architect für SalesFlow AI, ein KI-gestütztes Sales CRM.

TECH STACK:
- Frontend: React 18, TailwindCSS, Vite
- Backend: FastAPI (Python), Supabase (PostgreSQL)
- AI: OpenAI GPT-4, Anthropic Claude
- Deployment: Railway (Backend), Vercel (Frontend)

AKTUELLE DATEIEN:
[Füge hier relevante Files ein: main.py, App.jsx, etc.]

AUFGABE:
Analysiere die aktuelle System-Architektur und erstelle:

1. ARCHITECTURE REVIEW:
   - Welche Bottlenecks siehst du?
   - Welche Security-Risiken gibt es?
   - Welche Performance-Probleme könnten auftreten?

2. OPTIMIZATION PLAN:
   - Konkrete Verbesserungsvorschläge (priorisiert)
   - Code-Beispiele für kritische Änderungen
   - Migration-Strategie (wenn nötig)

3. SCALABILITY ROADMAP:
   - Wie skaliert das System auf 1.000 User?
   - Welche Services müssen ausgelagert werden?
   - Caching-Strategie

DENKE STEP-BY-STEP. Nutze deine Reasoning-Fähigkeiten.
```

---

### PROMPT 2: Autopilot Engine Design
```
KONTEXT:
Das Autopilot-System soll automatisch auf eingehende Nachrichten reagieren.

AKTUELLER CODE:
[Füge backend/app/services/autopilot_engine.py ein]

ZIEL:
Erweitere die Autopilot Engine mit:

1. MULTI-CHANNEL SUPPORT:
   - WhatsApp, Email, LinkedIn, Instagram
   - Einheitliche Message-Verarbeitung
   - Channel-spezifische Formatierung

2. INTELLIGENT SCHEDULING:
   - Beste Sendezeit pro Kontakt
   - Timezone-Awareness
   - Rate Limiting (nicht zu viele Messages/Tag)

3. CONFIDENCE SCORING:
   - KI-Antwort nur senden wenn Confidence > 85%
   - Sonst: Human-in-the-Loop

4. A/B TESTING:
   - Verschiedene Antwort-Templates testen
   - Performance tracken
   - Auto-Optimization

DENKE DURCH:
- Welche Edge Cases gibt es?
- Wie vermeiden wir Spam?
- Wie garantieren wir Qualität?

AUSGABE:
- Detailliertes Design-Dokument
- Python-Code mit Type Hints
- Error Handling für alle Fälle
```

---

### PROMPT 3: Database Optimization Strategy
```
KONTEXT:
SalesFlow AI nutzt Supabase (PostgreSQL).

AKTUELLE TABELLEN:
- leads (~10k Rows, wachsend)
- message_events (~100k Rows, wachsend schnell)
- contacts (~5k Rows)
- deals (~2k Rows)
- crm_notes (~20k Rows)

SCHEMA:
[Füge SQL Schema ein]

PROBLEM:
- Queries werden langsam (>2 Sekunden)
- Dashboard-Laden dauert lange
- Analytics-Queries timeout

AUFGABE:
1. QUERY ANALYSIS:
   - Welche Queries sind langsam? (identifiziere aus Code)
   - Warum sind sie langsam?

2. OPTIMIZATION PLAN:
   - Welche Indizes fehlen?
   - Welche Queries müssen umgeschrieben werden?
   - Sollten wir Materialized Views nutzen?
   - Brauchen wir Partitioning?

3. CACHING STRATEGY:
   - Was cachen wir wo? (Redis? In-Memory? Supabase Cache?)
   - Cache Invalidation Strategy
   - TTL für verschiedene Datentypen

4. IMPLEMENTATION:
   - SQL Migration Scripts
   - Python Code für Caching
   - Monitoring (wie messen wir Performance?)

DENKE GRÜNDLICH. Berücksichtige Trade-offs.
```

---

### PROMPT 4: AI Integration Architecture
```
KONTEXT:
SalesFlow AI nutzt mehrere AI-APIs:
- OpenAI GPT-4 (primary)
- Anthropic Claude (fallback)
- Custom AI Prompts

AKTUELLE IMPLEMENTIERUNG:
[Füge app/core/ai_prompts.py ein]

ZIEL:
Entwerfe eine robuste AI-Integration mit:

1. MULTI-MODEL SUPPORT:
   - Primary: GPT-4o
   - Fallback: Claude 3.5
   - Cost Optimization: GPT-4o-mini für einfache Tasks

2. SMART ROUTING:
   - Welches Model für welche Task?
   - Load Balancing
   - Cost vs. Quality Balance

3. ERROR HANDLING:
   - API Timeouts → automatischer Fallback
   - Rate Limits → Queue System
   - Invalid Responses → Retry mit anderem Model

4. PROMPT OPTIMIZATION:
   - Prompt Versioning (A/B Testing)
   - Few-Shot Learning (lernt von User-Feedback)
   - Context Management (relevante Info nur)

5. MONITORING:
   - Token Usage Tracking
   - Response Quality Metrics
   - Cost per Request

AUSGABE:
- System Design Dokument
- Python Implementation
- Monitoring Dashboard Spec
```

---

## 👨‍💻 CLAUDE OPUS 4.5 PROMPTS

### PROMPT 1: Backend Core Development
```
KONTEXT:
Du bist Senior Backend Developer für SalesFlow AI.

TECH STACK:
- FastAPI (Python 3.11+)
- Supabase (PostgreSQL)
- Pydantic für Validation
- JWT Authentication (geplant)

AKTUELLE STRUKTUR:
backend/
├── app/
│   ├── main.py (FastAPI App)
│   ├── routers/ (18 Router-Files)
│   ├── services/ (Business Logic)
│   ├── schemas/ (Pydantic Models)
│   └── db/ (Database Layer)

AUFGABE 1: JWT Authentication implementieren
─────────────────────────────────────────────

1. REQUIREMENTS:
   - JWT Token mit 24h Expiry
   - Refresh Token mit 30 Tage Expiry
   - Role-based Access Control (user, admin)
   - Token Blacklist bei Logout

2. IMPLEMENTIERE:
   ├── app/core/auth.py (JWT Logic)
   ├── app/core/security.py (Password Hashing)
   ├── app/schemas/auth.py (Auth Schemas)
   ├── app/routers/auth.py (Login/Signup/Refresh)
   └── app/core/deps.py (Dependency: get_current_user)

3. SECURITY BEST PRACTICES:
   - bcrypt für Passwords
   - Secrets in Environment Variables
   - Rate Limiting für Login (5 attempts)
   - HTTPS only
   - Secure Cookies

4. TESTING:
   - Unit Tests für alle Funktionen
   - Integration Test für Auth Flow
   - Test für Edge Cases (expired token, invalid token, etc.)

AUSGABE:
- Vollständiger Code (produktionsreif)
- Migration Script (SQL)
- API Documentation (OpenAPI)
- Test Suite
```

---

### PROMPT 2: Database Layer mit Error Handling
```
KONTEXT:
Die aktuelle Supabase-Integration ist direkt in den Routern.
Wir brauchen ein sauberes Repository Pattern.

AKTUELLE SITUATION:
# router
def get_leads():
    db = get_supabase()
    result = db.table("leads").select("*").execute()
    return result.data

PROBLEME:
- Kein Error Handling
- Schwer zu testen
- Business Logic in Routern
- Keine Wiederverwendbarkeit

ZIEL:
Erstelle ein Repository Pattern für alle Tabellen.

BEISPIEL-STRUKTUR:
backend/app/db/repositories/
├── base.py (BaseRepository)
├── leads.py (LeadRepository)
├── contacts.py (ContactRepository)
└── message_events.py (MessageEventRepository)

REQUIREMENTS:

1. BASE REPOSITORY:
class BaseRepository:
    def __init__(self, supabase: Client):
        self.db = supabase
        self.table_name = ""
    
    async def get_by_id(self, id: UUID) -> Optional[Dict]:
        # Implementiere mit Error Handling
    
    async def get_all(self, filters: Dict = None) -> List[Dict]:
        # Implementiere mit Pagination
    
    async def create(self, data: Dict) -> Dict:
        # Implementiere mit Validation
    
    async def update(self, id: UUID, data: Dict) -> Dict:
        # Implementiere mit Partial Updates
    
    async def delete(self, id: UUID) -> bool:
        # Soft Delete bevorzugt

2. ERROR HANDLING:
   - DatabaseError (Connection Issues)
   - NotFoundError (404)
   - ValidationError (400)
   - PermissionError (403)
   - ConflictError (409) - z.B. duplicate email

3. LOGGING:
   - Alle DB-Operationen loggen
   - Slow Queries warnen (>500ms)
   - Errors mit Stack Trace

4. TESTING:
   - Mock Supabase für Unit Tests
   - Integration Tests mit Test-DB

IMPLEMENTIERE:
- base.py mit allen CRUD-Operationen
- leads.py als Beispiel-Implementation
- Error Classes in app/core/exceptions.py
- Tests in tests/db/

CODE QUALITÄT:
- Type Hints überall
- Docstrings (Google Style)
- Clean Code Principles
- SOLID Principles
```

---

### PROMPT 3: API Endpoints Refactoring
```
KONTEXT:
Die aktuellen API-Router müssen refactored werden.

AKTUELLER CODE:
[Füge app/routers/leads.py ein]

PROBLEME:
- Business Logic in Routern
- Keine Dependency Injection
- Inkonsistente Error Handling
- Fehlende Validation

ZIEL:
Refactore alle Router nach Best Practices.

PATTERN:
┌─────────────┐
│   Router    │ (HTTP Layer)
└──────┬──────┘
       │
┌──────▼──────┐
│   Service   │ (Business Logic)
└──────┬──────┘
       │
┌──────▼──────┐
│ Repository  │ (Data Access)
└─────────────┘

BEISPIEL REFACTORED:

# app/routers/leads.py
@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: UUID,
    service: LeadService = Depends(get_lead_service),
    current_user: User = Depends(get_current_user)
):
    """Get lead by ID."""
    try:
        lead = await service.get_lead(lead_id, user_id=current_user.id)
        return lead
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Lead not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not authorized")

# app/services/lead_service.py
class LeadService:
    def __init__(self, repo: LeadRepository):
        self.repo = repo
    
    async def get_lead(self, lead_id: UUID, user_id: UUID) -> Lead:
        """Get lead with permission check."""
        lead = await self.repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError("Lead not found")
        
        if lead["user_id"] != user_id:
            raise PermissionError("Not authorized")
        
        return Lead(**lead)

AUFGABE:
1. Refactore app/routers/leads.py
2. Erstelle app/services/lead_service.py
3. Implementiere Dependency Injection
4. Einheitliches Error Handling
5. Tests für alle Endpoints

WIEDERHOLE für:
- contacts.py
- deals.py
- autopilot.py
- copilot.py

QUALITÄT:
- Type Hints
- Docstrings
- Error Handling
- Tests
```

---

### PROMPT 4: Security Audit & Implementation
```
KONTEXT:
SalesFlow AI muss production-ready sein.

AUFGABE:
Führe einen Security Audit durch und implementiere Fixes.

PRÜFE:

1. AUTHENTICATION & AUTHORIZATION:
   ├── Sind alle Endpoints geschützt?
   ├── JWT Token sicher implementiert?
   ├── Password Hashing (bcrypt)?
   ├── Session Management?
   └── Role-based Access Control?

2. INPUT VALIDATION:
   ├── Pydantic Models für alle Inputs?
   ├── SQL Injection Prevention?
   ├── XSS Prevention?
   ├── CSRF Protection?
   └── File Upload Validation?

3. API SECURITY:
   ├── Rate Limiting implementiert?
   ├── CORS richtig konfiguriert?
   ├── HTTPS enforced?
   ├── Security Headers gesetzt?
   └── API Key Rotation?

4. DATA PROTECTION:
   ├── Sensitive Data verschlüsselt?
   ├── PII-Data gehashed?
   ├── Logs enthalten keine Secrets?
   └── Database Backups verschlüsselt?

5. DEPENDENCIES:
   ├── Alle Dependencies up-to-date?
   ├── Known Vulnerabilities? (pip-audit)
   └── Unused Dependencies entfernt?

FÜR JEDES PROBLEM:
1. SEVERITY: Critical / High / Medium / Low
2. BESCHREIBUNG: Was ist das Problem?
3. IMPACT: Was kann passieren?
4. FIX: Konkreter Code-Fix
5. TEST: Wie testen wir den Fix?

AUSGABE:
- Security Audit Report (Markdown)
- Priority-sorted Fix List
- Implementation Code
- Security Tests
```

---

## 🎨 GEMINI 3 ULTRA PROMPTS

### PROMPT 1: React Frontend Development
```
KONTEXT:
Du bist Full-Stack Developer für SalesFlow AI Frontend.

TECH STACK:
- React 18.3
- TypeScript
- TailwindCSS
- React Router 6
- Vite

AKTUELLE STRUKTUR:
src/
├── components/ (220+ Components)
├── pages/ (50+ Pages)
├── hooks/ (Custom Hooks)
├── services/ (API Calls)
└── context/ (State Management)

DESIGN SYSTEM:
- Aura OS Theme (Glassmorphism)
- Dark Mode
- Emerald/Green Accent Color
- Smooth Animations (Framer Motion)

AUFGABE 1: Dashboard Page Optimierung
──────────────────────────────────────

AKTUELLE PAGE:
[Füge src/pages/DashboardPage.tsx ein]

PROBLEME:
- Lädt langsam (>3 Sekunden)
- Nicht responsive
- Zu viele API Calls
- Keine Loading States
- Keine Error Boundaries

OPTIMIERE:

1. PERFORMANCE:
   - React.memo für Components
   - useMemo für berechnete Werte
   - useCallback für Callbacks
   - Code Splitting (React.lazy)
   - Virtualisierung für lange Listen

2. API OPTIMIZATION:
   - Combine API Calls (batch)
   - Caching (React Query / SWR)
   - Optimistic Updates
   - Pagination

3. UX IMPROVEMENTS:
   - Skeleton Screens für Loading
   - Error Boundaries mit Retry
   - Empty States
   - Pull-to-Refresh (Mobile)

4. RESPONSIVE DESIGN:
   - Mobile-First
   - Tablet Optimierung
   - Desktop Layout

IMPLEMENTIERE:
- Optimierte DashboardPage.tsx
- Neue Custom Hooks (useDashboardData)
- Loading Components
- Error Boundaries
- Responsive Styles

TEST:
- Lighthouse Score >90
- Mobile Performance Test
- Different Screen Sizes
```

---

### PROMPT 2: Component Library Systematisierung
```
KONTEXT:
Wir haben 220+ React Components ohne klare Struktur.

ZIEL:
Erstelle ein systematisches Component System.

STRUKTUR:

src/components/
├── ui/ (Atomic Design)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   └── ...
│
├── forms/ (Form Components)
│   ├── LeadForm.tsx
│   ├── ContactForm.tsx
│   └── ...
│
├── layout/ (Layout Components)
│   ├── AppShell.tsx
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── ...
│
├── features/ (Feature-specific)
│   ├── autopilot/
│   ├── analytics/
│   ├── leads/
│   └── ...
│
└── shared/ (Shared Components)
    ├── ErrorBoundary.tsx
    ├── LoadingSpinner.tsx
    └── ...

AUFGABE:

1. AUDIT:
   - Analysiere alle 220+ Components
   - Kategorisiere sie
   - Finde Duplikate
   - Identifiziere Verbesserungspotenzial

2. REFACTOR:
   - Erstelle ui/ Components (Atomic)
   - Entferne Duplikate
   - TypeScript Types sauber
   - Props mit Defaults
   - Storybook-ready

3. DESIGN SYSTEM:
   - Einheitliche Styles (Tailwind)
   - Variants (primary, secondary, danger)
   - Sizes (sm, md, lg)
   - States (hover, active, disabled)

4. DOCUMENTATION:
   - JSDoc für jede Component
   - Props-Tabelle
   - Usage Examples
   - Accessibility Notes

BEISPIEL:

// src/components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

/**
 * Button Component - Aura OS Design System
 * 
 * @example
 * <Button variant="primary" size="lg">
 *   Click me
 * </Button>
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  onClick
}) => {
  // Implementation
};

STARTE MIT:
- Button, Input, Card (wichtigste UI Components)
- Dann: Forms, Layout
- Zuletzt: Features refactoren
```

---

### PROMPT 3: E2E Testing Suite mit Cypress
```
KONTEXT:
SalesFlow AI braucht comprehensive E2E Tests.

SETUP:
- Cypress 13
- TypeScript
- Visual Regression Testing

AUFGABE:
Erstelle vollständige E2E Test Suite.

STRUKTUR:
cypress/
├── e2e/
│   ├── auth/
│   │   ├── login.cy.ts
│   │   └── signup.cy.ts
│   ├── leads/
│   │   ├── create-lead.cy.ts
│   │   ├── edit-lead.cy.ts
│   │   └── delete-lead.cy.ts
│   ├── dashboard/
│   │   └── dashboard-loads.cy.ts
│   ├── autopilot/
│   │   └── autopilot-settings.cy.ts
│   └── ...
│
├── support/
│   ├── commands.ts (Custom Commands)
│   └── helpers.ts
│
└── fixtures/
    ├── users.json
    ├── leads.json
    └── ...

TEST CASES (PRIORITÄT):

1. AUTHENTICATION FLOW:
   ✅ User kann sich registrieren
   ✅ User kann sich einloggen
   ✅ User kann sich ausloggen
   ✅ Expired Token → Redirect zu Login
   ✅ Invalid Credentials → Error Message

2. LEAD MANAGEMENT:
   ✅ Leads-Liste lädt
   ✅ Neuer Lead erstellen (Form Validation)
   ✅ Lead bearbeiten
   ✅ Lead löschen (mit Confirmation)
   ✅ Lead suchen/filtern

3. DASHBOARD:
   ✅ Dashboard lädt alle Widgets
   ✅ KPIs zeigen korrekte Zahlen
   ✅ Charts rendern
   ✅ Responsive auf Mobile

4. AUTOPILOT:
   ✅ Settings speichern
   ✅ Message Events anzeigen
   ✅ Suggestions reviewen
   ✅ Engine manuell triggern

5. CHAT SYSTEM:
   ✅ Chat-Liste lädt
   ✅ Nachricht senden
   ✅ KI-Antwort erscheint
   ✅ Real-time Updates

BEISPIEL TEST:

// cypress/e2e/leads/create-lead.cy.ts
describe('Lead Creation', () => {
  beforeEach(() => {
    cy.login(); // Custom Command
    cy.visit('/crm/leads');
  });

  it('should create a new lead successfully', () => {
    cy.get('[data-cy="create-lead-btn"]').click();
    
    cy.get('[data-cy="lead-name"]').type('Max Mustermann');
    cy.get('[data-cy="lead-email"]').type('max@example.com');
    cy.get('[data-cy="lead-phone"]').type('+49 123 456789');
    cy.get('[data-cy="lead-status"]').select('interested');
    
    cy.get('[data-cy="save-lead-btn"]').click();
    
    cy.contains('Lead erfolgreich erstellt').should('be.visible');
    cy.url().should('include', '/crm/leads');
    cy.contains('Max Mustermann').should('be.visible');
  });

  it('should validate required fields', () => {
    cy.get('[data-cy="create-lead-btn"]').click();
    cy.get('[data-cy="save-lead-btn"]').click();
    
    cy.contains('Name ist erforderlich').should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    cy.intercept('POST', '/api/leads', {
      statusCode: 500,
      body: { error: 'Server Error' }
    });
    
    cy.get('[data-cy="create-lead-btn"]').click();
    cy.get('[data-cy="lead-name"]').type('Test');
    cy.get('[data-cy="save-lead-btn"]').click();
    
    cy.contains('Fehler beim Erstellen').should('be.visible');
  });
});

IMPLEMENTIERE:
- Alle Priority 1 Tests (Auth, Leads, Dashboard)
- Custom Commands (login, createLead, etc.)
- Fixtures für Test-Daten
- CI/CD Integration (GitHub Actions)

BONUS:
- Visual Regression Tests (Screenshots)
- Accessibility Tests (cy-axe)
- Performance Tests (Lighthouse)
```

---

### PROMPT 4: Documentation & Visual Assets
```
KONTEXT:
SalesFlow AI braucht comprehensive Documentation.

ZIEL:
Erstelle komplette User & Developer Documentation mit visuals.

STRUKTUR:

docs/
├── user-guide/
│   ├── getting-started.md
│   ├── features/
│   │   ├── leads.md
│   │   ├── autopilot.md
│   │   ├── analytics.md
│   │   └── ...
│   ├── faq.md
│   └── troubleshooting.md
│
├── developer/
│   ├── setup.md
│   ├── architecture.md
│   ├── api-reference.md
│   ├── contributing.md
│   └── testing.md
│
└── assets/
    ├── screenshots/
    ├── diagrams/
    └── videos/

NUTZE DEINE MULTIMODAL-FÄHIGKEITEN:

1. SCREENSHOTS:
   - Erstelle Screenshots von allen Major Features
   - Annotiere wichtige UI-Elemente
   - Zeige Step-by-Step Flows

2. DIAGRAMS:
   - System Architecture Diagram
   - Database Schema Diagram
   - User Flow Diagrams
   - Component Hierarchy

3. CODE EXAMPLES:
   - Syntax-highlighted Code Blocks
   - Working Examples (copy-paste ready)
   - Common Use Cases

USER GUIDE (getting-started.md):

# 🚀 Getting Started mit SalesFlow AI

## Was ist SalesFlow AI?
SalesFlow AI ist ein KI-gestütztes Sales CRM für Network Marketing...

## Quick Start (5 Minuten)

### Schritt 1: Account erstellen
[Screenshot: Signup Page]

1. Gehe zu https://salesflow-ai.com
2. Klicke auf "Registrieren"
3. Fülle das Formular aus
4. Bestätige deine Email

### Schritt 2: Ersten Lead erstellen
[Screenshot: Create Lead Form mit Annotations]

1. Klicke auf "CRM" → "Leads"
2. Klicke "Neuer Lead"
3. Gib Name und Kontaktdaten ein
4. Wähle Status (z.B. "Interessiert")
5. Klicke "Speichern"

### Schritt 3: Autopilot aktivieren
[Screenshot: Autopilot Settings]

...

## Features im Detail

### 🤖 AI Copilot
[Screenshot + Beschreibung]

### 📊 Analytics Dashboard
[Screenshot + Beschreibung]

### 💬 Chat System
[Screenshot + Beschreibung]

...

DEVELOPER GUIDE (architecture.md):

# 🏗️ System Architecture

## Overview
[Architecture Diagram mit allen Services]

## Tech Stack
- Frontend: React 18 + TypeScript
- Backend: FastAPI + Python 3.11
- Database: PostgreSQL (Supabase)
- AI: OpenAI GPT-4, Anthropic Claude

## Project Structure
[Directory Tree mit Erklärungen]

## API Architecture
[API Flow Diagram]

...

IMPLEMENTIERE:
1. User Guide (alle Features dokumentiert)
2. Developer Guide (Setup bis Deployment)
3. API Reference (automatisch aus OpenAPI?)
4. FAQ & Troubleshooting
5. Screenshots & Diagrams

FORMAT:
- Markdown (GitHub-compatible)
- Mermaid für Diagrams
- Code Blocks mit Syntax Highlighting
```

---

## 🔄 WORKFLOW KOORDINATION

### Daily Workflow

```
MORGEN (9:00 - 12:00)
──────────────────────────────────────────────────
1. GPT-5.1 Thinking: Planning & Architecture
   → Erstellt Task-Liste für den Tag
   → Reviewed gestrigen Code
   → Plant komplexe Features

2. Claude Opus 4.5: Backend Development
   → Implementiert Tasks von GPT-5.1
   → Schreibt Tests
   → Refactored Code

3. Gemini 3 Ultra: Frontend Development
   → Implementiert UI Components
   → Updated Styles
   → Schreibt E2E Tests


MITTAG (12:00 - 14:00)
──────────────────────────────────────────────────
→ Integration Testing
→ Bug Fixes
→ Code Review (gegenseitig)


NACHMITTAG (14:00 - 18:00)
──────────────────────────────────────────────────
1. Claude: Code Quality & Refactoring
   → Reviews Code von Gemini
   → Refactored für Production
   → Security Checks

2. Gemini: Testing & Documentation
   → E2E Tests für neue Features
   → Documentation updated
   → Screenshots erstellt

3. GPT-5.1: Complex Features
   → Autopilot Logic
   → AI Integration
   → Performance Optimization


ABEND (18:00 - 20:00)
──────────────────────────────────────────────────
→ Final Testing
→ Deployment (Staging)
→ Planning nächster Tag (GPT-5.1)
```

---

## 📊 WÖCHENTLICHER SPRINT

### Woche 1: Foundation
```
MONDAY:    GPT-5.1 → Architecture Review & Planning
           Claude → JWT Authentication
           Gemini → Dashboard UI Refactoring

TUESDAY:   Claude → Repository Pattern Implementation
           Gemini → Component Library Start
           GPT-5.1 → Database Optimization Plan

WEDNESDAY: Claude → API Endpoints Refactoring
           Gemini → Forms & Validation UI
           GPT-5.1 → AI Integration Design

THURSDAY:  Claude → Error Handling & Logging
           Gemini → E2E Test Suite Setup
           GPT-5.1 → Autopilot Engine Logic

FRIDAY:    ALLE → Integration, Testing, Bug Fixes
           GPT-5.1 → Week Review & Next Week Planning
```

### Woche 2: Features
```
MONDAY:    Claude → Advanced API Features
           Gemini → Analytics Dashboard UI
           GPT-5.1 → Collective Intelligence Design

TUESDAY:   Claude → IDPS Backend
           Gemini → Chat UI Improvements
           GPT-5.1 → Multi-Channel Strategy

WEDNESDAY: Claude → Phoenix System Backend
           Gemini → Lead Management UI
           GPT-5.1 → Caching Strategy

THURSDAY:  Claude → Security Audit & Fixes
           Gemini → Responsive Design
           GPT-5.1 → Performance Optimization

FRIDAY:    ALLE → Testing, Documentation, Review
```

### Woche 3-4: Polish & Launch
```
Similar structure...
Focus: Testing, Bug Fixes, Documentation, Deployment
```

---

## 📁 FILE SHARING BETWEEN MODELS

### Context Sharing Format

```
PROJEKT: SalesFlow AI
DATUM: [Aktuelles Datum]
SPRINT: Woche [X], Tag [Y]

═══════════════════════════════════════════════════
KONTEXT FÜR NÄCHSTEN AGENT
═══════════════════════════════════════════════════

VON: [Model Name - z.B. Claude Opus 4.5]
AN: [Model Name - z.B. Gemini 3 Ultra]

AUFGABE ABGESCHLOSSEN:
✅ JWT Authentication implementiert
✅ Tests geschrieben (100% Coverage)
✅ API Endpoints refactored

FILES GEÄNDERT:
- backend/app/core/auth.py (neu)
- backend/app/routers/auth.py (neu)
- backend/app/core/deps.py (updated)

NÄCHSTE SCHRITTE FÜR DICH:
1. Frontend: Login/Signup Pages aktualisieren
2. API Integration: auth.service.ts erstellen
3. State Management: User Context erweitern
4. E2E Tests: Authentication Flow testen

RELEVANTER CODE:
[Hier aktuellen Code einfügen]

BEKANNTE ISSUES:
- Noch kein Rate Limiting
- Refresh Token Frontend fehlt

FRAGEN/BLOCKERS:
- Keine
```

---

## 🎯 SUCCESS METRICS

### Täglich tracken:
```
┌─────────────────────────────────────────┐
│ DAILY PROGRESS                          │
├─────────────────────────────────────────┤
│ Tasks Completed:        [ X / Y ]       │
│ Tests Passing:          [ X / Y ]       │
│ Bugs Fixed:             [ X ]           │
│ Code Coverage:          [ XX% ]         │
│ Lighthouse Score:       [ XX ]          │
│ API Response Time:      [ XX ms ]       │
└─────────────────────────────────────────┘
```

### Wöchentlich reviewen:
```
✅ Features Completed
✅ Code Quality (Linter Errors: 0)
✅ Test Coverage >80%
✅ Documentation Updated
✅ Performance Benchmarks
```

---

## 🚀 READY TO START?

Jedes Model kann mit seinem **PROMPT 1** starten!

**REIHENFOLGE:**
1. **GPT-5.1** → Architecture Review (PROMPT 1)
2. **Claude** → Backend Development (PROMPT 1) 
3. **Gemini** → Frontend Development (PROMPT 1)

Dann iterativ weitermachen!

**LOS GEHT'S!** 🔥💪

