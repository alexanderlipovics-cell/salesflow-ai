# ✅ Commission Tracker Page - Setup

## Was wurde gemacht? ✅

1. ✅ **CommissionTrackerPage.tsx erstellt**
   - Nutzt bestehende `useApi` und `useMutation` Hooks
   - Integriert Auth-Header automatisch
   - Responsive Design mit Tailwind CSS
   - Formular mit react-hook-form

2. ✅ **Routing hinzugefügt**
   - Route `/commissions` in `App.jsx` eingetragen
   - Geschützt durch `ProtectedRoute`

## Dependencies prüfen 📦

Stelle sicher, dass folgende Pakete installiert sind:

```bash
npm install lucide-react react-hook-form date-fns clsx tailwind-merge
```

Falls nicht vorhanden:

```bash
cd src
npm install lucide-react react-hook-form
```

## Features 🎯

- ✅ Monatsübersicht mit Filter
- ✅ Status-Filter (pending, paid, overdue)
- ✅ Summary Cards (Brutto, Netto, Steuer, Offene)
- ✅ Tabelle mit allen Provisionen
- ✅ PDF-Download pro Provision
- ✅ "An Buchhaltung senden" Funktion
- ✅ Modal zum Erstellen neuer Provisionen
- ✅ Live-Preview der Provision beim Erstellen

## API-Endpoints die verwendet werden:

- `GET /api/commissions?month=YYYY-MM-01&status=...`
- `GET /api/commissions/summary?month=YYYY-MM-01`
- `POST /api/commissions`
- `GET /api/commissions/{id}/invoice` (PDF)
- `POST /api/commissions/{id}/send-to-accounting`

## Testen 🧪

1. **Backend starten:**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Frontend starten:**
   ```bash
   npm run dev
   ```

3. **Öffne im Browser:**
   ```
   http://localhost:3000/commissions
   ```

## Nächste Schritte (Optional) 🔄

1. **Deal-Auswahl im Formular:**
   - Dropdown mit echten Deals aus `/api/deals`
   - Auto-Fill von Deal-Wert

2. **Bulk-Actions:**
   - Mehrere Provisionen auswählen
   - Bulk PDF-Export
   - Bulk "An Buchhaltung senden"

3. **Charts:**
   - Provision-Trend über Zeit
   - Vergleich Monat zu Monat

---

**Die Page ist einsatzbereit! 🚀**

