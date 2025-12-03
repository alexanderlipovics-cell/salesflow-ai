# 🚀 Squad Coach Analytics V2 – Deployment Checklist

## ✅ Pre-Deployment Checklist

### **Code Quality**
- [x] Alle Bugfixes implementiert
- [x] Keine Linter Errors
- [x] TypeScript Types komplett
- [x] React.memo Performance Optimizations
- [x] Error Boundaries vorhanden
- [x] Loading States überall

### **Testing**
- [x] Unit Tests für FocusAreaBadge
- [x] Unit Tests für useSquadCoachReport
- [ ] E2E Tests (optional)
- [ ] Visual Regression Tests (optional)
- [ ] Performance Tests (optional)

### **Documentation**
- [x] README erstellt (SQUAD_COACH_V2_SUMMARY.md)
- [x] Deployment Guide erstellt (This file!)
- [x] Code Comments vorhanden
- [x] Type Definitions dokumentiert

---

## 📦 Deployment Steps

### **1. Installation**
```bash
cd salesflow-ai
npm install
```

### **2. Build testen**
```bash
npm run build
```

### **3. Tests ausführen**
```bash
# Run all tests
npm test

# Run only Squad Coach tests
npm test -- Squad

# Run with coverage
npm test -- --coverage
```

### **4. Integration in bestehende App**

#### Option A: Als neue Page
```typescript
// In your router (e.g., App.tsx or routes.ts)
import { SquadCoachPageV2 } from '@/pages/SquadCoachPageV2';

// Add route
<Route 
  path="/squad-coach-v2" 
  element={<SquadCoachPageV2 workspaceId={workspaceId} />} 
/>
```

#### Option B: Ersetze alte SquadCoachPage
```typescript
// Rename old file
// mv src/pages/SquadCoachPage.tsx src/pages/SquadCoachPageV1_OLD.tsx

// Update imports
import { SquadCoachPageV2 as SquadCoachPage } from '@/pages/SquadCoachPageV2';
```

### **5. Environment Setup**

Stelle sicher, dass die SQL Function `squad_coach_report` existiert:

```sql
-- Prüfe ob Function existiert
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'squad_coach_report';

-- Falls nicht, erstelle sie aus dem Reactivation Engine Migration
-- (Falls noch nicht vorhanden, siehe backend/db/migrations/)
```

### **6. Database Verification**

```sql
-- Test die Function
SELECT * FROM squad_coach_report(
  'YOUR_WORKSPACE_ID'::uuid,
  30  -- days_back
);

-- Erwartetes Result:
-- user_id | full_name | email | role | health_score | focus_area | ...
```

---

## 🔧 Configuration Options

### **Time Range**
```typescript
// Default: 30 Tage
<SquadCoachPageV2 workspaceId={id} />

// Custom initial range (wird dann vom User änderbar sein)
// Setze in Component State: useState(60)
```

### **Refetch Interval**
```typescript
// In useSquadCoachReport Hook:
const squadCoach = useSquadCoachReport(workspaceId, {
  daysBack: 30,
  refetchInterval: 300000, // 5 minutes (default)
  // oder: refetchInterval: 0 // deaktiviert
});
```

### **Export Filename**
```typescript
<ExportButton 
  reports={reports} 
  workspaceName="My Company"  // ← wird im Filename verwendet
/>
```

---

## 🐛 Troubleshooting

### **Problem: "squad_coach_report is not a function"**
**Lösung:** SQL Function fehlt in der Datenbank
```sql
-- Erstelle die Function (siehe backend/db/migrations/)
-- Oder warte bis die Migration ausgeführt wurde
```

### **Problem: "No data loading"**
**Lösung:** Workspace ID oder User ID fehlt
```typescript
// Prüfe ob workspaceId korrekt übergeben wird
console.log('Workspace ID:', workspaceId);
```

### **Problem: "Chart doesn't render"**
**Lösung:** Recharts dependency fehlt
```bash
npm install recharts
```

### **Problem: "Export button does nothing"**
**Lösung:** Browser blockiert Downloads
- Erlaube Downloads in Browser Settings
- Teste in Incognito Mode

### **Problem: "Linter errors in tests"**
**Lösung:** Jest config fehlt
```bash
# Prüfe ob jest.config.js existiert
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

---

## 📊 Monitoring

### **Wichtige Metriken nach Deployment**

1. **Performance**
   - Initial Load Time: <500ms
   - Filter Switch Time: <50ms
   - Export Time: <100ms

2. **Usage**
   - Anzahl daily active users
   - Anzahl Exports pro Woche
   - Durchschnittliche Session-Dauer

3. **Errors**
   - Error Rate < 0.1%
   - Failed RPC Calls
   - Browser Console Errors

### **Logging**
```typescript
// Enable debug logging
localStorage.setItem('DEBUG_SQUAD_COACH', 'true');

// In useSquadCoachReport:
console.log('[Squad Coach] Fetching reports...');
console.log('[Squad Coach] Got', reports.length, 'reports');
```

---

## 🔒 Security Checklist

- [x] SQL Functions mit SECURITY DEFINER
- [x] RLS Policies aktiv (über Supabase)
- [x] Input Validation (TypeScript Types)
- [x] No SQL Injection möglich (RPC calls)
- [x] CSV Export nur client-side (no server)
- [ ] Rate Limiting (optional, via Supabase)

---

## 🚦 Go-Live Checklist

### **Pre-Launch** (24h vorher)
- [ ] Backup der Datenbank erstellen
- [ ] Rollback-Plan dokumentieren
- [ ] Team informieren (Slack/Email)
- [ ] Staging Environment testen

### **Launch** (Tag X)
- [ ] Code auf Production deployen
- [ ] Database Migration ausführen (falls nötig)
- [ ] Monitoring aktivieren
- [ ] First Smoke Tests (manuell)
- [ ] Announcement an User (optional)

### **Post-Launch** (Tag X+1 bis X+7)
- [ ] Performance-Metriken prüfen (täglich)
- [ ] Error Logs checken (täglich)
- [ ] User Feedback sammeln
- [ ] Bug Reports bearbeiten
- [ ] Usage Analytics auswerten

---

## 📞 Support Contacts

**Development Team:**
- Frontend: [Your Name]
- Backend: [Backend Dev]
- Database: [DB Admin]

**Emergency Rollback:**
```bash
# Revert to previous version
git checkout main
git revert <commit-hash>
git push origin main
```

---

## 🎉 Success Criteria

✅ **Deployment erfolgreich** wenn:
- Keine kritischen Errors in den ersten 24h
- <0.1% Error Rate
- Positive User Feedback
- Performance Targets erreicht
- Alle Tests passing

🚨 **Rollback nötig** wenn:
- >1% Error Rate
- Critical Bug entdeckt
- Performance Degradation >50%
- Database Issues

---

## 📈 Future Roadmap

### **Version 2.1** (Next 2 Weeks)
- [ ] PDF Export Implementation
- [ ] Coaching Action Modal
- [ ] Real-time Updates (WebSocket)

### **Version 2.2** (Next Month)
- [ ] Trend Charts (Time Series)
- [ ] Comparison View (Rep vs Team)
- [ ] Predictive Insights (ML)

### **Version 3.0** (Q2)
- [ ] Custom Dashboards
- [ ] Advanced Filtering
- [ ] Slack/Email Alerts
- [ ] Mobile App Support

---

**Ready to deploy? Let's go! 🚀**

