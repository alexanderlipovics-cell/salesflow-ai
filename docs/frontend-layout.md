# Frontend Layout Snapshot

- **AppShell**: `src/layout/AppShell.jsx`
  - Enthält die neue Deal-OS-Sidebar inklusive Nav-Gruppen (Heute, Network, Import, Sales Power, Pipeline) sowie Plan- und User-Widget.
  - Alle Routen werden als `<Outlet />` im rechten Content-Bereich gerendert. Mobile Geräte erhalten eine kompakte Top-Bar.

- **Hauptrouten**
  - `/chat` → `ChatPage` (`src/pages/ChatPage.jsx`)
  - `/daily-command` → `DailyCommandPage` (`src/pages/DailyCommandPage.jsx`)
  - `/dashboard` → `DashboardPage` (`src/pages/DashboardPage.jsx`)
  - `/speed-hunter` → `SpeedHunterPage` (`src/pages/PlaceholderPages.jsx`)
  - `/phoenix` → `PhoenixPage` (`src/pages/PlaceholderPages.jsx`)
  - `/screenshot-ai` → `ScreenshotAIPage` (`src/pages/PlaceholderPages.jsx`)
  - `/import/csv` → `CsvImportPage` (`src/pages/PlaceholderPages.jsx`)
  - `/network/team` → `NetworkTeamPage` (`src/pages/PlaceholderPages.jsx`)
  - `/network/duplication` → `NetworkDuplicationPage` (`src/pages/PlaceholderPages.jsx`)
  - `/einwand-killer` → `EinwandKillerPage` (`src/pages/PlaceholderPages.jsx`)
  - `/tools` → `AlleToolsPage` (`src/pages/PlaceholderPages.jsx`)
  - `/leads/prospects` → `LeadsProspectsPage` (`src/pages/LeadsProspectsPage.jsx`)
  - `/leads/customers` → `LeadsCustomersPage` (`src/pages/LeadsCustomersPage.jsx`)
  - `/settings` → `SettingsPage` (`src/pages/SettingsPage.jsx`)
  - `/pricing` → `PricingPage` (`src/components/PricingPage.jsx`, außerhalb des AppShell-Layouts)

- **Chat-Einbindung**
  - Die frühere Chat-Oberfläche wurde als `ChatPage` umgesetzt und hängt an `/chat`.
  - Rechte Kontext-Panels (Lead-Kontext, Bestandskunden importieren, aktive Sequenzen) sind Bestandteil dieser Page und erscheinen ausschließlich bei aktiver Route `/chat`.
