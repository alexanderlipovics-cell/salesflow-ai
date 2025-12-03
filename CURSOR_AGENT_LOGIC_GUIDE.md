# 🧠 CURSOR AGENT LOGIC SYSTEM - QUICK REFERENCE

## ✅ SYSTEM AKTIVIERT!

Dein Cursor Agent ist jetzt **logic-aware** und arbeitet intelligenter:

- ✅ Prüft Status vor jeder Aktion
- ✅ Vermeidet Duplikate
- ✅ Respektiert laufende Arbeit
- ✅ Baut inkrementell
- ✅ Fragt bei Unsicherheit

---

## 🎯 WIE DU ES NUTZT

### **Vorher (Old Agent):**

```
USER: "Erstelle Login Feature"
AGENT: *Erstellt sofort 10 Dateien*
       *Überschreibt existierenden Code*
       *Schlägt 15 weitere Features vor*
```

### **Jetzt (Logic Agent):**

```
USER: "Erstelle Login Feature"
AGENT: "Checking Status...
        ✓ Login bereits in /backend/app/routers/auth.py
        ✓ Frontend Login in /salesflow-ai/components/Login.tsx
        
        Status: Login Feature existiert bereits.
        
        Möchtest du:
        1. Bestehende Implementierung verbessern
        2. Dokumentation ergänzen
        
        Was passt besser?"
```

---

## 🚀 BEST PRACTICES FÜR DICH

### **1. Bei neuen Features:**

```bash
# ✅ GOOD: Lass den Agent checken
"Brauchen wir ein Auto-Reminder System?"

# ❌ BAD: Direkt fordern ohne Status
"Erstelle Auto-Reminder System" 
# (könnte schon existieren!)
```

### **2. Bei Fehlern:**

```bash
# ✅ GOOD: Kontext geben
"WhatsApp Service wirft Error in Zeile 45 - was ist da los?"

# ❌ BAD: Zu vage
"Fix den Code"
```

### **3. Bei Optimierungen:**

```bash
# ✅ GOOD: Prüfe zuerst Funktionalität
"Squad Coach Analytics laufen - können wir optimieren?"

# ❌ BAD: Optimiere zu früh
"Optimiere Squad Coach" 
# (funktioniert es überhaupt?)
```

---

## 🎨 RESPONSE PATTERNS

### **Muster 1: Status Check**

```
USER: "Implementiere X"

AGENT: "Checking Status...
        □ Existiert X bereits? [checking...]
        □ Ist Foundation fertig? [checking...]
        □ Dependencies ok? [checking...]
        
        Status: [Ergebnis]
        Aktion: [nur wenn alles klar]"
```

### **Muster 2: File Modification**

```
USER: "Update whatsapp_service.py"

AGENT: "Vor Änderung:
        □ Datei geöffnet/in Nutzung? ✓
        □ Git Status sauber? ✓
        □ Konflikte? ✗ (Server läuft)
        
        ⚠️ Server nutzt diese Datei gerade.
        
        Soll ich:
        1. Warten bis Server gestoppt
        2. Änderung in separate Branch
        
        Was passt?"
```

### **Muster 3: Optimization Request**

```
USER: "Optimiere DB Queries"

AGENT: "Pre-Optimization Check:
        □ Queries funktionieren? ✓
        □ Performance-Problem messbar? [checking...]
        □ Bottleneck identifiziert? [checking...]
        
        Status: Queries laufen gut (<50ms average)
        
        Empfehlung: Optimierung aktuell nicht nötig.
        Monitoring einrichten stattdessen?"
```

---

## 📊 MONITORING

### **Teste ob es funktioniert:**

**Test 1: Duplicate Prevention**

```bash
# Öffne Cursor Agent
USER: "Erstelle .cursorrules Datei"

# Erwartung:
AGENT: "✓ .cursorrules existiert bereits (428 Zeilen)
       Möchtest du sie bearbeiten statt neu erstellen?"
```

**Test 2: Status Check**

```bash
USER: "Alle Features implementiert?"

# Erwartung:
AGENT: "Checking Implementation Status...
       ✓ Backend: 128 files
       ✓ Frontend: 320 files
       ✓ Database: 42 SQL files
       
       Status: Kernfeatures implementiert.
       Was steht als nächstes an?"
```

**Test 3: Respect Running Work**

```bash
# Während Server läuft
USER: "Update main.py"

# Erwartung:
AGENT: "⚠️ main.py wird aktuell vom Server genutzt.
       Soll ich warten oder separate Branch?"
```

---

## 🎯 AGENT ENTSCHEIDUNGSBAUM

```
┌─────────────────┐
│  USER REQUEST   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ STATUS   │──NO──► ASK CLARIFICATION
    │ CLEAR?   │
    └────┬─────┘
         │ YES
    ┌────▼──────┐
    │ ALREADY   │──YES──► ACKNOWLEDGE + SKIP
    │ EXISTS?   │
    └────┬──────┘
         │ NO
    ┌────▼──────────┐
    │ FOUNDATION    │──NO──► BUILD FOUNDATION FIRST
    │ READY?        │
    └────┬──────────┘
         │ YES
    ┌────▼──────┐
    │ CONFLICTS │──YES──► ASK HOW TO PROCEED
    │ PRESENT?  │
    └────┬──────┘
         │ NO
    ┌────▼──────┐
    │  EXECUTE  │
    │  ACTION   │
    └────┬──────┘
         │
    ┌────▼──────────────┐
    │ MAX 1-2 OPTIONS   │
    │ PRIORITIZED       │
    └───────────────────┘
```

---

## 💡 PROMPTING CHEAT SHEET

### **Context geben:**

```bash
✅ "WhatsApp Service läuft, aber Nachrichten kommen nicht durch - was checken?"
❌ "WhatsApp geht nicht"

✅ "Squad Coach Report zeigt 0 Reps obwohl DB 50 hat - Query Problem?"
❌ "Squad Coach kaputt"

✅ "Auto-Reminder Feature brauchbar? Wenn ja, wie integrieren?"
❌ "Implementiere Auto-Reminder"
```

### **Status erfragen:**

```bash
✅ "Was ist der Stand bei [Feature]?"
✅ "Ist [System] deployed und getestet?"
✅ "Läuft gerade ein Prozess der [Datei] nutzt?"
```

### **Priorisierung fordern:**

```bash
✅ "Gib mir die TOP 2 nächsten Schritte"
❌ "Was kann ich alles machen?" (führt zu 20 Optionen)
```

---

## 🧪 TEST SZENARIEN

### **Szenario 1: User sagt "Done"**

```
INPUT: "Alle Prompts sind fertig"

ERWARTUNG:
"Great! Status Check:
 □ Wo sind die Prompts deployed? [checking...]
 □ Frontend integriert? [checking...]
 □ Tests vorhanden? [checking...]
 
 Was steht als nächstes an?"

NICHT:
"Soll ich noch mehr Features hinzufügen?"
```

### **Szenario 2: Agent läuft**

```
INPUT: "Agent arbeitet gerade am Backend"

ERWARTUNG:
"✓ Backend Agent läuft
 Welche Phase? [checking...]
 
 Soll ich:
 1. Parallel Frontend starten
 2. Backend monitoren
 
 Was passt?"

NICHT:
"Lass mich auch Backend-Files editieren..."
```

### **Szenario 3: Feature existiert**

```
INPUT: "Füge Follow-up System hinzu"

ERWARTUNG:
"Checking...
 ✓ backend/app/services/followup_service.py (350 lines)
 ✓ backend/database/followup_system.sql
 ✓ FOLLOWUP_SYSTEM_COMPLETE.md
 
 Status: Follow-up System existiert.
 
 Soll ich:
 1. Dokumentation zeigen
 2. Features erweitern
 
 Was brauchst du?"

NICHT:
*Erstellt neue followup_service.py*
```

---

## 🎯 QUALITÄTS-METRIKEN

**Nach jeder Interaktion, prüfe:**

```
□ Hat Agent Status gecheckt? ✅/❌
□ Hat Agent Duplikate vermieden? ✅/❌
□ Hat Agent laufende Arbeit respektiert? ✅/❌
□ War Response concise (<3 Optionen)? ✅/❌
□ Hat Agent bei Unsicherheit gefragt? ✅/❌
```

**Wenn ❌ → Feedback geben:**

```
"Agent, du hast [Datei] überschrieben obwohl sie existiert.
 Nächstes Mal: Erst checken, dann fragen."
```

Der Agent lernt aus direktem Feedback!

---

## 🔄 CONTINUOUS IMPROVEMENT

### **Feedback Loop:**

```
1. Agent macht Aktion
2. Observe Ergebnis
3. War es logic-aware?
   ├─ JA → Great, weiter so
   └─ NEIN → Feedback geben → Agent adjustiert
4. Nächste Interaktion besser
```

### **Beispiel Feedback:**

```bash
# ❌ Agent erstellt Duplikat
USER: "Agent, whatsapp_service.py existiert bereits!
       Nächstes Mal: Erst mit 'grep' oder 'list' checken."

# Agent merkt sich für nächste Interaktion
```

---

## 📚 WEITERFÜHRENDE RESSOURCEN

### **Projekt-Spezifische Regeln:**

- Siehe `.cursorrules` ab Zeile 120 für Style Guides
- `MASTER_SPEC.md` für Architektur
- `MASTER_README.md` für Features

### **Logic Rules:**

- `.cursorrules` Zeilen 1-119 für Behavior
- `.cursor/settings.json` für Configuration

---

## 🚀 QUICK COMMANDS

### **Status prüfen:**

```bash
@workspace "Was ist der aktuelle Status?"
@workspace "Welche Features sind implementiert?"
@workspace "Läuft gerade ein Prozess?"
```

### **Intelligente Anfragen:**

```bash
@workspace "Brauche ich [Feature] oder existiert es schon?"
@workspace "Ist [System] ready für Optimierung?"
@workspace "TOP 2 nächste Schritte für [Ziel]"
```

### **Conflict Resolution:**

```bash
@workspace "[Datei] bearbeiten - ist das safe jetzt?"
@workspace "Kann ich [Feature] deployen oder Konflikte?"
```

---

## ✅ ZUSAMMENFASSUNG

**Der Logic-Aware Agent:**

1. ✅ **Checkt Status** bevor er handelt
2. ✅ **Vermeidet Duplikate** durch Prüfung
3. ✅ **Respektiert laufende Arbeit** (Dateien, Prozesse)
4. ✅ **Baut inkrementell** (Foundation → Features)
5. ✅ **Fragt bei Unsicherheit** statt zu raten
6. ✅ **Gibt 1-2 Optionen** statt 10
7. ✅ **Optimiert zur richtigen Zeit** (nach Stabilität)

**Dein Vorteil:**

- ⚡ Weniger Duplikate
- ⚡ Keine File-Konflikte
- ⚡ Effizientere Kommunikation
- ⚡ Schnellerer Progress
- ⚡ Weniger "Undo" nötig

---

## 🎉 DU BIST READY!

Der Agent ist jetzt **logic-aware** und arbeitet intelligenter mit dir.

**Teste es:**

```bash
"Agent, erstelle .cursorrules Datei"
```

**Erwartung:**

```
"✓ .cursorrules existiert bereits (480 Zeilen inkl. Logic Rules)
 Soll ich etwas daran ändern oder ist alles gut?"
```

Viel Erfolg! 🚀

---

**Bei Fragen/Problemen:**

1. Prüfe `.cursorrules` (Logic Rules Zeile 1-119)
2. Prüfe `.cursor/settings.json` (Agent Config)
3. Gib direktes Feedback wenn Agent nicht logic-aware agiert

Der Agent wird kontinuierlich besser! 🧠✨

