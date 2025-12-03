# 🧪 TEAM-CHIEF Testing & Demo System

**Status:** ✅ Vollständig implementiert

---

## 📋 Übersicht

Das **TEAM-CHIEF Testing System** bietet eine vollständige Test-Infrastruktur für die AI-Coaching-Qualität:

- ✅ **6 Test-Szenarien** - Balanced, Struggling, Star-Heavy, Perfect, All Inactive, New Squad
- ✅ **Input/Output Validation** - Automatische Validierung der Datenstrukturen
- ✅ **Quality Scoring** - 0-100 Score mit detailliertem Feedback
- ✅ **Interactive Demo UI** - Live-Testing mit allen Szenarien
- ✅ **Copy-to-Clipboard** - Nachrichtenvorlagen direkt kopierbar

---

## 🚀 Quick Start

### **1. Demo-Seite öffnen**

```
http://localhost:5173/demo/team-chief
```

### **2. Szenario auswählen**

- **Balanced Squad** - Standard-Fall mit Mix aus Performern
- **Struggling Squad** - Niedriges Engagement, viele Inaktive
- **Star-Heavy Squad** - 2-3 Superstars, Rest inaktiv
- **Perfect Squad** - Alle aktiv, Target übertroffen
- **All Inactive** - Worst Case - komplett eingeschlafen
- **New Squad** - Frisch gestartet, niedrige Zahlen

### **3. Coaching starten**

- Klicke "Coaching starten"
- Warte auf AI-Response (2-5 Sekunden)
- Prüfe Quality Score
- Review Insights & Nachrichtenvorlagen

---

## 📊 Quality Scoring System

### **Score-Berechnung (0-100 Punkte)**

| Kategorie | Max. Punkte | Kriterien |
|-----------|-------------|-----------|
| **Summary** | 20 | Länge 50-300 Zeichen |
| **Highlights** | 15 | 2-4 Highlights ideal |
| **Risks** | 15 | 1-4 Risks identifiziert |
| **Priorities** | 15 | 2-4 Prioritäten |
| **Coaching Actions** | 20 | 2-5 Actions, Tonvielfalt (+5 Bonus) |
| **Messages** | 15 | Länge OK, [Name] Placeholder vorhanden |

### **Gute Output-Indikatoren**

- ✅ Quality Score: **80-100**
- ✅ 2-4 Highlights
- ✅ 1-3 Risks
- ✅ 2-4 Priorities
- ✅ 2-5 Coaching Actions
- ✅ Mindestens 2 verschiedene `tone_hints`
- ✅ Messages 50-400 Zeichen
- ✅ `[Name]` Placeholder in Templates

### **Red Flags**

- ❌ Quality Score < 60
- ❌ Leere Arrays
- ❌ Fehlende Message Templates
- ❌ Keine Tonvielfalt
- ❌ Generische, nicht-szenario-spezifische Ratschläge

---

## 🧪 Test-Szenarien Details

### **1. Balanced Squad**

**Daten:**
- 12 Members, 9 aktiv, 3 inaktiv
- 1240 Punkte / 2000 Target
- Top: Sabrina (360), Marco (260), Alex (210)
- Nachzügler: Lisa (75), Tom (40)

**Erwarteter Fokus:**
- Lisa und Tom reaktivieren
- Top-Performer als Mentoren einsetzen
- Inaktive Members ansprechen

### **2. Struggling Squad**

**Daten:**
- 8 Members, 2 aktiv, 6 inaktiv
- 220 Punkte / 2000 Target
- Leader kämpft alleine (120 Punkte)

**Erwarteter Fokus:**
- Dringend Momentum aufbauen
- Individuelle Blockaden verstehen
- Realistische Ziele setzen
- Leader entlasten

### **3. Star-Heavy Squad**

**Daten:**
- 10 Members, 3 aktiv, 7 inaktiv
- 1805 Punkte / 2000 Target
- Nina (850) + Paul (720) = 87% der Punkte

**Erwarteter Fokus:**
- Abhängigkeit von Top-Performern reduzieren
- Mittleres Segment aktivieren
- Stars als Mentoren nutzen aber nicht überlasten

### **4. Perfect Squad**

**Daten:**
- 10 Members, 10 aktiv, 0 inaktiv
- 2640 Punkte / 2000 Target (übertroffen!)
- Alle über 300 Punkte

**Erwarteter Fokus:**
- Momentum aufrechterhalten
- Nächstes Level setzen
- Team feiern
- Erfolgsroutinen dokumentieren

### **5. All Inactive**

**Daten:**
- 8 Members, 0 aktiv, 8 inaktiv
- 50 Punkte / 2000 Target
- Komplett eingeschlafen

**Erwarteter Fokus:**
- Challenge eventuell neu starten
- Individuelle 1:1 Gespräche
- Grundmotivation hinterfragen

### **6. New Squad**

**Daten:**
- 5 Members, 5 aktiv, 0 inaktiv
- 180 Punkte (niedrig, aber aktiv)
- Challenge gerade gestartet

**Erwarteter Fokus:**
- Frühes Momentum nutzen
- Erwartungen setzen
- Routinen etablieren

---

## 🔍 Validation Rules

### **Input Validation**

- ✅ Leader data complete
- ✅ Squad data complete
- ✅ Challenge data complete
- ✅ Valid date range (end > start)
- ✅ Leaderboard has entries
- ✅ Member stats has entries
- ✅ Summary consistency (points match)

### **Output Validation**

- ✅ All required fields present
- ✅ Highlights: non-empty array
- ✅ Risks: array (can be empty)
- ✅ Priorities: non-empty array
- ✅ Coaching Actions: valid structure
- ✅ Message templates: all present

---

## 📝 Usage Examples

### **Test mit Balanced Squad**

```typescript
1. Öffne /demo/team-chief
2. Wähle "Balanced Squad"
3. Klicke "Coaching starten"
4. Prüfe Quality Score (sollte > 80 sein)
5. Review Highlights - sollten Lisa/Tom erwähnen
6. Prüfe Coaching Actions - sollten 2-5 sein
7. Copy Squad Message → Test in WhatsApp
```

### **Test mit Struggling Squad**

```typescript
1. Wähle "Struggling Squad"
2. Starte Coaching
3. Prüfe ob Risks identifiziert werden
4. Prüfe ob Priorities auf Momentum fokussieren
5. Prüfe Underperformer Template - sollte empathisch sein
```

---

## 🐛 Troubleshooting

### **Problem: Validation Errors**

**Lösung:**
- Prüfe Test-Szenario Datenstruktur
- Stelle sicher, dass alle Felder vorhanden sind
- Prüfe Datums-Format (ISO)

### **Problem: Quality Score zu niedrig**

**Lösung:**
- Prüfe AI-Output in "Raw JSON" Tab
- Stelle sicher, dass alle Arrays gefüllt sind
- Prüfe Message-Längen
- Prüfe ob [Name] Placeholder vorhanden

### **Problem: API Error 401/403**

**Lösung:**
- User muss eingeloggt sein
- User muss Leader des Squads sein (für echte Squads)
- Für Testing: `test_input` wird verwendet

---

## 📚 Dateien

### **Types**
- `src/types/teamChief.ts` - Alle TypeScript Interfaces

### **Test Data**
- `src/data/testScenarios.ts` - 6 Test-Szenarien

### **Validation**
- `src/utils/teamChiefValidation.ts` - Input/Output Validation & Quality Scoring

### **Components**
- `src/components/coaching/TeamChiefDemo.tsx` - Demo UI
- `src/pages/TeamChiefDemoPage.tsx` - Demo Page

### **Backend**
- `backend/app/routers/squad_coach.py` - Unterstützt `test_input` Parameter

---

## ✅ Testing Checklist

- [ ] Alle 6 Szenarien getestet
- [ ] Quality Scores > 80 für gute Szenarien
- [ ] Validation fängt Fehler ab
- [ ] Copy-to-Clipboard funktioniert
- [ ] Message Templates haben [Name] Placeholder
- [ ] Coaching Actions haben Tonvielfalt
- [ ] Output ist szenario-spezifisch (nicht generisch)

---

## 🎯 Nächste Schritte

1. **Test alle Szenarien** durch
2. **Quality Scores dokumentieren** für Baseline
3. **System Prompt optimieren** basierend auf Scores
4. **Edge Cases testen** (leere Arrays, etc.)
5. **User Feedback sammeln** zu Coaching-Qualität

**Bereit für Testing!** 🚀

