# Hidden / Inactive Features & Pages

## Page Inventory
- Gesamtseiten: **68** (`src/pages`, tsx+jsx).
- Geroutet (in `src/App.jsx`, 64 Route-Vorkommen): Login, Signup, Auth, Compact/Marketing Landing, Vertical Landing Varianten, Onboarding, MagicSend, Chat, Daily Command, Hunter, Dashboard Router/Complete, Choose Vertical, Pricing, Settings (+/ai, +/knowledge), Commissions, Cold Call, Closing Coach, Performance, Gamification, Lead Qualifier, Lead Discovery, GTM Copy, Leads Prospects/Customers, Import, Lead Hunter, Delay Master, Follow Ups, Objections, Next Best Actions, Team-Chief Demo, Manager Objections/Followup-Templates, Phoenix, Field Ops, CRM Contacts/Detail, Pipeline, Leads/Detail, Templates, Coach, Coach/Squad, Analytics, Autopilot, Power Hour, Churn Radar, Network Graph, Roleplay Dojo, Magic Send, Compensation Simulator, Genealogy.

### Vorhanden, aber nicht geroutet (potenziell versteckt)
- `AIPromptsPage.tsx`
- `BillingManagement.tsx`
- `NetworkMarketingDashboard.tsx`
- `VideoMeetingsPage.tsx`
- `FollowUpAnalyticsPage.tsx`
- Squad-Coach-Varianten: `SquadChallengeManager.tsx`, `SquadCoachPriorityPage.tsx`, `SquadCoachPageV2.tsx`, `SquadCoachView.tsx`
- Doppelte Varianten: `DashboardPage.jsx` (neben .tsx), `LeadQualifierPage.jsx` etc. (alt/duplikat)
- Platzhalter: `PagePlaceholder.jsx`, `PlaceholderPages.jsx`

## Navigation / Sidebar (sichtbar verlinkt)
- Aus `layout/AppShell.tsx`: Autopilot, Compensation Simulator, Power Hour, Churn Radar, Network Graph, Genealogy Tree, Roleplay Dojo (+ Standard-Menüs).
- VerticalSidebarExample (Demo): Genealogy, Power Hour (Feature-Hinweis).

## Feature-Schlüssel / Keywords (gefunden)
- MagicSend (komponenten & Demo), Compensation, Genealogy, Roleplay, Churn, Power Hour, Network Graph, Autopilot.
- Magic Link / Passwordless: **keine Treffer** → nicht implementiert oder entfernt.

## Feature-Gates / Flags
- `components/ModuleSelector.tsx`: `isEnabled`/`enabledModules` für Module.
- `components/branding/CompanyBanner.tsx`: `showFeatures` Toggle.
- `components/billing/FeatureGate.tsx`: Feature-Gating per `FEATURE_INFO` (Plan-basiert).
- Keine globalen `FEATURE_*` Flags gefunden.

## Hinweise für Aktivierung
- Nicht-geroutete Seiten bei Bedarf in `src/App.jsx` (oder Navigation) verlinken.
- Prüfen, ob SquadCoach-Varianten konsolidiert werden sollen.
- Magic Link fehlt: ggf. neuen Flow/Endpoint ergänzen, falls benötigt.

