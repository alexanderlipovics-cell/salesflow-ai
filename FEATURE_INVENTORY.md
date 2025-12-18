# Feature Inventory (aktuell im Code vorhanden)

## Routing-Status
- **Routen in `src/App.jsx`**: Login, Signup, Auth, CompactLanding (`/`), MarketingLanding (`/full`), Redirect `/app→/chat`, VerticalLanding (mehrere Pfade), Onboarding, MagicSend; geschützte Routen: Chat, Daily-Command, Hunter, Dashboard (Router + Complete), Choose-Vertical, Pricing, Settings, Commissions, Cold-Call, Closing-Coach, Performance, Gamification, Lead-Qualifier, Lead-Discovery, Settings/AI, GTM-Copy, Leads/Prospects, Leads/Customers, Import, Lead-Hunter, Delay-Master, Follow-Ups, Objections, Next-Best-Actions, Team-Chief Demo, Manager/Objections, Manager/Followup-Templates, Settings/Knowledge, Phoenix, Field-Ops, CRM Contacts/Detail, CRM Pipeline, CRM Leads/Detail, Templates, Coach, Coach/Squad, Analytics, Autopilot, Power-Hour, Churn-Radar, Network-Graph, Roleplay-Dojo, Magic-Send, Compensation-Simulator, Genealogy; Fallback → `/login`.
- **VerticalProvider**: `CoreVerticalProvider` aus `src/core/VerticalContext` umschließt die gesamte Router-Struktur (inkl. Dashboard-Routen).

## Pages vorhanden (Auszug) vs. Routen
- **Geroutet (siehe oben)**: ChatPage, DashboardRouterPage/DashboardPage, PricingPage, ChooseVerticalPage, AnalyticsDashboard, AutopilotPage, AICoachPage (`/coach`), MagicSendDemo, usw.
- **Vorhanden aber nicht in `App.jsx` geroutet (potenziell versteckt/inaktiv):**
  - AIPromptsPage.tsx
  - BillingManagement.tsx
  - NetworkMarketingDashboard.tsx
  - VideoMeetingsPage.tsx
  - FollowUpAnalyticsPage.tsx
  - SquadChallengeManager.tsx
  - SquadCoachPriorityPage.tsx
  - SquadCoachPageV2.tsx
  - SquadCoachView.tsx
  - DelayMaster? (geroutet), PowerHour? (geroutet) → bereits aktiv
  - Placeholder/Utility: PagePlaceholder.jsx, PlaceholderPages.jsx
  - Duplicate variants: DashboardPage.jsx (neben .tsx)

## Branding-Varianten (Funde)
- **Aura/AURA**: LoginForm.tsx, LoginPage.tsx, OnboardingScreen.tsx, MobileDashboard.tsx (AURA OS / AURA Flow).
- **SalesFlow / Sales Flow / SalesFlow AI**: weit verbreitet in Landing- und Layout-Dateien (z.B. VerticalLandingPage.tsx, CompactLandingPage.tsx, MarketingLandingPage.tsx, AppShell.tsx, NetworkMarketingDashboard.tsx, Magic*-Komponenten). Keine NEXUS-Nennungen gefunden.

## Pricing / Pläne / Subscription
- **Komponenten/Seiten**: PricingPage.tsx, components/pricing/FelloPricingSection.tsx, components/PricingPage.jsx, context/PricingModalContext.jsx, components/PricingModal.jsx, screens/settings/PricingScreen.tsx, screens/billing/SubscriptionScreen.tsx, lib/plans.js, components/PlanCard.jsx, hooks/useContactPlans.js, goal-wizard/NoPlanFallback.tsx, goal-wizard/StepPlanSummary.tsx.
- **Preisdaten/Hinweise**: MarketingLandingPage.tsx enthält Pricing-Pläne; OnboardingScreen.tsx nutzt `config/pricing`; weitere Pricing/Upgrade-Bezüge in Alerts (upgrade_opportunity), BillingManagement.tsx (Plan-Wechsel), PricingPage FAQ (Upgrade/Downgrade), CompanyKnowledgeSettingsPage (Tab „Preise & Konditionen“).
- **Hardcodierte Preise gesucht (Pattern €29/€59/€119/€499)**: keine exakten Treffer, aber zahlreiche „pricing/upgrade“-Vorkommen in obigen Dateien.

## Landing/Marketing-Seiten
- CompactLandingPage.tsx, MarketingLandingPage.tsx, VerticalLandingPage.tsx (+ Styles), screens/marketing/LandingPage.tsx, styles/compact-landing.css, styles/marketing-landing.css.

## Sonstige Features/Komponenten (nicht prominent im Routing/Nav)
- Chat Import: components/chat-import, services/chatImportService (API unter `/chat-import/*`).
- Lead/CRM Extras: FollowUpAnalyticsPage.tsx (nicht geroutet), AIPromptsPage.tsx (Prompt-Verwaltung), NetworkMarketingDashboard.tsx (spezifisches Dashboard).
- Squad/Coach Varianten: mehrere SquadCoach*-Pages (nur `/coach` und `/coach/squad` geroutet).
- VideoMeetingsPage.tsx (keine Route).
- BillingManagement.tsx (keine Route) – Plan-Upgrade/Management UI vorhanden.

## Empfohlene nächste Schritte
- Entscheiden, welche der ungerouteten Pages aktiv werden sollen (Routing oder Feature-Flags).
- Branding konsolidieren (Aura OS vs. SalesFlow AI) je nach Produktlinie.
- Pricing-Komponenten und Datenquelle vereinheitlichen (MarketingLanding vs. PricingPage vs. Mobile/Onboarding).
- Überprüfen, ob Legacy-/Duplikat-Pages (z.B. DashboardPage.jsx vs .tsx, PlaceholderPages) entfernt oder verlinkt werden sollen.

