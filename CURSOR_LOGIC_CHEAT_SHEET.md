# 🎯 CURSOR AGENT LOGIC - CHEAT SHEET

## ⚡ QUICK REFERENCE

---

## 🎯 CORE RULES

| Rule | Was es bedeutet | Beispiel |
|------|----------------|----------|
| **STATUS CHECK FIRST** | Immer Status prüfen vor Aktion | "Existiert das Feature schon?" |
| **AVOID DUPLICATES** | Keine doppelte Arbeit | Checke vor Erstellung |
| **RESPECT RUNNING WORK** | Keine Interrupts | Warte auf laufende Prozesse |
| **INCREMENTAL MODE** | Foundation → Features → Optimize | Basis zuerst, dann Extras |
| **ASK WHEN UNCLEAR** | Fragen > Raten | "Meinst du Option A oder B?" |
| **MAX 2 OPTIONS** | Concise Communication | Nicht 10 Vorschläge auf einmal |

---

## ✅ ACTION CHECKLIST

```
BEFORE CREATING FILES:
□ Datei existiert schon?
□ Richtiges Verzeichnis?
□ Foundation ready?

BEFORE MODIFYING FILES:
□ Datei in Nutzung?
□ Git Status clean?
□ Backups nötig?

BEFORE SUGGESTING FEATURES:
□ Feature implementiert?
□ Dependencies erfüllt?
□ Jetzt oder später?

BEFORE OPTIMIZING:
□ Code funktioniert?
□ Performance-Problem messbar?
□ Premature optimization?
```

---

## 🚦 DECISION FLOW

```
REQUEST → STATUS CHECK → EXISTS? → SKIP/MODIFY
                       ↓ NO
                   FOUNDATION? → BUILD IT FIRST
                       ↓ YES
                   CONFLICTS? → ASK USER
                       ↓ NO
                   EXECUTE (max 2 options)
```

---

## 💬 PROMPT TEMPLATES

### **Für neue Features:**

```bash
✅ "Brauchen wir [Feature] oder existiert es?"
✅ "Was ist der Stand bei [Feature]?"
✅ "Ist [System] ready für [Feature]?"
```

### **Für Modifications:**

```bash
✅ "[Datei] bearbeiten - ist das jetzt safe?"
✅ "Server läuft - kann ich [Datei] trotzdem ändern?"
✅ "Git Status vor Änderung an [Datei]?"
```

### **Für Optimierungen:**

```bash
✅ "[System] läuft - wo optimieren?"
✅ "Performance-Problem bei [X] - was messen?"
✅ "Ist [Feature] stabil genug für Optimization?"
```

---

## 🧪 QUICK TESTS

**Test 1: Duplicate Prevention**

```bash
INPUT: "Erstelle .cursorrules"
EXPECT: "✓ Existiert bereits (480 Zeilen). Bearbeiten?"
```

**Test 2: Status Check**

```bash
INPUT: "Implementiere X"
EXPECT: "Checking... X existiert in [path]. Was genau brauchst du?"
```

**Test 3: Respect Work**

```bash
INPUT: "Update main.py" (während Server läuft)
EXPECT: "⚠️ Server nutzt main.py. Warten oder separate Branch?"
```

---

## 📊 QUALITY METRICS

```
GOOD AGENT:
✅ Fragt vor Annahmen
✅ Checkt vor Erstellen
✅ Wartet vor Unterbrechen
✅ Baut inkrementell
✅ Max 2 Optionen

BAD AGENT:
❌ Erstellt Duplikate
❌ Unterbricht laufende Arbeit
❌ Optimiert zu früh
❌ 10 Optionen auf einmal
❌ Rät statt fragt
```

---

## 🎯 COMMON SCENARIOS

### **Szenario: "Agent macht Duplikate"**

```bash
PROBLEM: Agent erstellt Dateien die existieren

FIX: "Agent, [Datei] existiert! Nächstes Mal: Erst checken."

RESULT: Agent merkt sich für nächste Interaktion
```

### **Szenario: "Zu viele Optionen"**

```bash
PROBLEM: Agent gibt 10 Vorschläge

FIX: "Agent, gib mir nur TOP 2 Schritte"

RESULT: Agent priorisiert ab jetzt
```

### **Szenario: "Premature Optimization"**

```bash
PROBLEM: Agent optimiert bevor Feature läuft

FIX: "Agent, Feature muss erst funktionieren. Dann optimieren."

RESULT: Agent wartet auf Stabilität
```

---

## 🔧 FILES & CONFIG

```bash
# Configuration Files
.cursorrules                  # Logic Rules + Style Guides
.cursor/settings.json         # Agent Behavior Config

# Documentation
CURSOR_AGENT_LOGIC_GUIDE.md  # Full Guide
CURSOR_LOGIC_CHEAT_SHEET.md  # This File (Quick Ref)

# Usage
@workspace "Command hier"     # Agent nutzt Logic Rules
```

---

## 🚀 QUICK COMMANDS

```bash
# Status prüfen
@workspace "Aktueller Status?"
@workspace "Welche Features implementiert?"
@workspace "Läuft ein Prozess?"

# Smart Requests
@workspace "Brauche [Feature] oder existiert es?"
@workspace "TOP 2 nächste Schritte"
@workspace "[Datei] bearbeiten safe?"

# Feedback
@workspace "Agent, du hast [X] gemacht - nächstes Mal [Y]"
```

---

## 💡 PRO TIPS

1. **Context is King**: Gib dem Agent Kontext statt nur Commands
2. **Status First**: Frag nach Status bevor du Features forderst
3. **Feedback Loop**: Gib direktes Feedback wenn Agent nicht logic-aware
4. **Incremental**: Frag nach 1-2 nächsten Schritten, nicht allen
5. **Trust but Verify**: Agent checkt, aber vertraue und verifiziere

---

## 📋 PRINT & PIN

```
┌─────────────────────────────────────────┐
│  CURSOR AGENT LOGIC CHEAT SHEET         │
├─────────────────────────────────────────┤
│  1. STATUS CHECK FIRST                  │
│  2. AVOID DUPLICATES                    │
│  3. RESPECT RUNNING WORK                │
│  4. INCREMENTAL MODE                    │
│  5. ASK WHEN UNCLEAR                    │
│  6. MAX 2 OPTIONS                       │
├─────────────────────────────────────────┤
│  FILES:                                 │
│  • .cursorrules (Logic + Style)         │
│  • .cursor/settings.json (Config)       │
│  • CURSOR_AGENT_LOGIC_GUIDE.md (Full)   │
├─────────────────────────────────────────┤
│  TEST:                                  │
│  @workspace "Erstelle .cursorrules"     │
│  → Expect: "Existiert bereits"          │
└─────────────────────────────────────────┘
```

---

**🎉 READY TO USE!**

Halte dieses Sheet griffbereit beim Arbeiten mit dem Cursor Agent.

**Bei Fragen:** Siehe `CURSOR_AGENT_LOGIC_GUIDE.md` für Details.

