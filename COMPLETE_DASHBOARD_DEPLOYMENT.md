# Complete Dashboard – Deployment & QA Checklist

## 1. SQL / Supabase
- [ ] Migration `20251201_dashboard_need_help_reps.sql` ausgeführt (`supabase db push` oder SQL Editor)
- [ ] Funktion `dashboard_need_help_reps` getestet (`select * from dashboard_need_help_reps(...)`)
- [ ] Index `events_user_type_contact_time_idx` existiert (`\d public.events`)
- [ ] `EXPLAIN ANALYZE` < 500 ms für alle Dashboard-RPCs

## 2. Frontend Build
- [ ] `npm install` im Projekt `salesflow-ai`
- [ ] `npm run dev` – Hot Reload funktioniert
- [ ] `npm run build` läuft ohne Fehler
- [ ] Route `/dashboard/complete` erreichbar
- [ ] `.env` enthält `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`

## 3. Funktionale Checks
- [ ] Auto-Refresh aktualisiert Cards & Charts alle 2 Minuten
- [ ] „Aktualisieren“-Button triggert alle RPCs (Netzwerk prüfen)
- [ ] Virtuelle Liste (Follow-up-Tab) bleibt flüssig bei 200+ Tasks
- [ ] Need-Help-Tabelle zeigt Coaching-Button (Keyboard + Screenreader)
- [ ] Template-Chart lazy-loaded & responsiv
- [ ] Fehlerbanner erscheint bei Supabase-Ausfall

## 4. Accessibility & Responsiveness
- [ ] Tastatur-Navigation (Tab, Enter, Space) für Tasks & Buttons
- [ ] ARIA-Labels vorhanden (`role="button"` bei Tabellenzeilen)
- [ ] Mobile View (≤ 768 px) ohne horizontales Scrollen
- [ ] Dark-/Light-Mode überprüft (falls aktiv)

## 5. Tests & Monitoring
- [ ] `npm test` (oder `npx vitest`) für Hook-Tests
- [ ] Sentry/Monitoring-DNS konfiguriert (optional)
- [ ] Browser-Performanceprofil < 2 s LCP
- [ ] Supabase Rate Limits beobachtet (Dashboard RPCs < 8 parallel)

## 6. Übergabe / Doku
- [ ] README/Docs verlinken (`COMPLETE_DASHBOARD_DEPLOYMENT.md`)
- [ ] Workspace-ID für Produktion dokumentiert
- [ ] Owner informiert über neuen Pfad `/dashboard/complete`
- [ ] Tickets für „React Query“ / „CSV Export“ / „Realtime“ erstellt

✅ Sobald alle Checkboxen gesetzt sind → Release freigeben.

