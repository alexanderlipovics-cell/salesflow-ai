# Layout Overview

- **AppShell**: `src/layout/AppShell.tsx` stellt die linke Sidebar (Logo, Gruppen, Plan- und Account-Karten) bereit und rendert die Route-Inhalte über den React-Router-`Outlet`.
- **Hauptrouten** (alle eingebettet in `AppShell`):
  - `/chat` → `src/pages/ChatPage.jsx`
  - `/daily-command` → `src/pages/DailyCommandPage.jsx`
  - `/dashboard` → `src/pages/DashboardPage.jsx`
  - `/pricing` → `src/components/PricingPage.jsx`
  - `/settings` → `src/pages/SettingsPage.jsx`
  - `/network/team`, `/network/duplication`, `/screenshot-ai`, `/import/csv`, `/speed-hunter`, `/phoenix`, `/einwand-killer`, `/all-tools`, `/leads/prospects`, `/leads/customers` → Placeholder-Seiten über `src/pages/PagePlaceholder.jsx`
- **Chat-Einbindung**: Die bisherige Chat-Oberfläche wurde in `src/pages/ChatPage.jsx` rekonstruiert und ist über die Route `/chat` erreichbar. Sie läuft innerhalb von `AppShell`, sodass Sidebar links und Kontext-Panels rechts parallel angezeigt werden.
