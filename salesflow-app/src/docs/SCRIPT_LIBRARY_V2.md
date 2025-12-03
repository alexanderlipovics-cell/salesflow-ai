# 📚 NETWORKER OS - SCRIPT LIBRARY v2.0

> **50+ bewährte Scripts für jede Situation im Network Marketing**  
> Anpassbar an DISG-Persönlichkeitstypen und Kontext

---

## 🎯 Übersicht

Die Script Library v2.0 enthält **52 professionelle Scripts** für Network Marketing, die:

- ✅ **Dynamisch an DISG-Typen angepasst** werden
- ✅ **Automatisch Variablen ersetzen** (Name, Produkt, etc.)
- ✅ **Performance-Tracking** für kontinuierliche Optimierung bieten
- ✅ **Smart Suggestion** - KI schlägt das beste Script vor

---

## 📑 Kategorien

| Kategorie | Scripts | Beschreibung |
|-----------|---------|--------------|
| **Erstkontakt** | #1-10 | Warmer & kalter Markt, Online-Leads |
| **Follow-Up** | #11-19 | Nach Präsentation, Ghosted, Langzeit |
| **Einwand-Behandlung** | #20-35 | Alle wichtigen Einwände |
| **Closing** | #36-41 | Soft, Assumptive, Urgency |
| **Team-Onboarding** | #42-47 | Willkommen, Coaching, Motivation |
| **Reaktivierung** | #48-49 | Inaktive Kunden & Partner |
| **Social Media** | #50-52 | Story, Posts, neue Follower |

---

## 🔌 API-Endpunkte

### Base URL
```
https://api.salesflow.app/api/v2/scripts
```

### Scripts abrufen

```http
GET /scripts?category=einwand&disg=S&relationship_level=warm
```

**Query-Parameter:**
- `category` - Kategorie (erstkontakt, follow_up, einwand, closing, onboarding, reaktivierung, social_media)
- `context` - Spezifischer Kontext (keine_zeit, ghosted, etc.)
- `disg` - DISG-Typ (D, I, S, G) für automatische Anpassung
- `relationship_level` - Beziehungslevel (kalt, lauwarm, warm, heiss)
- `adapt_to_disg` - Boolean, ob Anpassung erfolgen soll (default: true)
- `limit` - Max. Anzahl (default: 10)

### Script nach Nummer

```http
GET /scripts/number/20?disg=D&contact_name=Max
```

Holt Script #20 (Zeit-Einwand), angepasst für D-Typ mit Name ersetzt.

### Smart Suggestion

```http
POST /scripts/suggest
Content-Type: application/json

{
  "situation_description": "Kunde sagt er hat keine Zeit",
  "disg_type": "S",
  "contact_name": "Max",
  "variables": {
    "Produkt": "BalanceOil"
  }
}
```

**Response:**
```json
{
  "id": "...",
  "number": 20,
  "name": "Zeit-Einwand (Standard)",
  "text": "Das verstehe ich total, Max! Zeit ist wertvoll...",
  "adapted_for_disg": "S",
  "tone_recommendation": "reassuring"
}
```

### Quick Access

```http
# Alle Einwand-Scripts
GET /scripts/quick/objections?disg=D

# Follow-Up Scripts
GET /scripts/quick/followup?context=ghosted

# Closing Scripts
GET /scripts/quick/closing?style=soft
```

### DISG-Hinweise

```http
GET /scripts/disg/hints/S
```

**Response:**
```json
{
  "disg_type": "S",
  "name": "Stetig - Teamplayer",
  "rules": [
    "Druck rausnehmen",
    "Sicherheit betonen",
    "Mehr Zeit geben",
    "Beziehung betonen"
  ],
  "tone": "reassuring"
}
```

### Performance-Tracking

```http
POST /scripts/{script_id}/log
Content-Type: application/json

{
  "was_sent": true,
  "got_reply": true,
  "was_positive": true,
  "converted": false,
  "response_time_minutes": 45,
  "channel": "whatsapp",
  "disg_type": "I"
}
```

---

## 📊 DISG-Anpassung

Die Scripts werden automatisch an den DISG-Typ des Kontakts angepasst:

### D (Dominant) - Macher
- ✂️ **Kürzer** (30% weniger Text)
- 🎯 **Direkter** Ton
- 📊 **ROI-fokussiert**
- ❌ Keine langen Einleitungen
- ❌ Wenig Emojis

### I (Initiativ) - Entertainer
- 🎉 **Mehr Emojis**
- 🗣️ **Enthusiastischer** Ton
- 👥 **Social Proof** betonen
- 📖 **Stories** einbauen

### S (Stetig) - Teamplayer
- 🕊️ **Kein Druck**
- 🔒 **Sicherheit** betonen
- ⏰ **Mehr Zeit** geben
- 🤝 **Beziehung** im Fokus

### G (Gewissenhaft) - Analytiker
- 📈 **Fakten & Zahlen**
- 📋 **Detailliert**
- 🧠 **Logisch** argumentieren
- ❌ Keine Übertreibungen

---

## 📝 Script-Beispiele

### #1 - Der ehrliche Ansatz (Warm)

```
Hey [Name]! 👋

Ich weiß, das kommt jetzt vielleicht überraschend, aber ich hab 
vor kurzem etwas Spannendes angefangen und du bist eine der 
ersten Personen, an die ich gedacht habe.

Es geht um [Produkt/Thema] - und bevor du jetzt denkst "Oh nein, 
will der mir was verkaufen" 😅 - ich würde dir einfach gerne 
kurz zeigen, worum es geht. 

Wenn's nichts für dich ist, völlig okay. Aber ich würde mich 
über deine ehrliche Meinung freuen.

Hättest du diese Woche 15 Minuten Zeit für einen kurzen Call?
```

### #20 - Zeit-Einwand (Standard)

```
Das verstehe ich total! Zeit ist wertvoll.

Darf ich dich was fragen? Wenn du WÜSSTEST, dass das 
funktioniert und dir [gewünschtes Ergebnis] bringen könnte - 
würdest du dir dann die Zeit nehmen?

[Wenn ja]: Super! Dann lass uns schauen, wie wir das in 
deinen Alltag integrieren können. Viele meiner Partner 
arbeiten nur [X] Stunden pro Woche daran.

[Wenn nein]: Kein Problem! Was müsste passieren, damit 
es für dich interessant wird?
```

### #26 - MLM/Pyramide Einwand

```
Gute Frage! Ich mag Menschen, die kritisch hinterfragen. 🙌

Kurze Antwort: Nein, es ist kein Pyramidensystem.

Der Unterschied: Bei einem Pyramidensystem verdient man 
NUR durch Rekrutierung. Bei uns verdienen Menschen mit 
echten Produkten, die echte Probleme lösen.

Ich selbst [konkrete Erfolgsgeschichte mit Produkt].

Darf ich dir zeigen, wie das genau funktioniert?
```

---

## 🏗️ Integration

### Frontend (React Native / Expo)

```typescript
import { useScripts } from '@/hooks/useScripts';

function ObjectionHandler({ disgType, context }) {
  const { data: scripts, isLoading } = useScripts({
    category: 'einwand',
    context: context,
    disg: disgType,
  });

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    showToast('Script kopiert!');
  };

  return (
    <FlatList
      data={scripts}
      renderItem={({ item }) => (
        <ScriptCard 
          script={item}
          onCopy={() => copyToClipboard(item.text)}
        />
      )}
    />
  );
}
```

### CHIEF AI Integration

```python
# CHIEF kann Scripts dynamisch abrufen
async def get_script_for_situation(situation: str, disg_type: str):
    response = await script_service.suggest_script(
        situation_description=situation,
        disg_type=DISGType(disg_type),
    )
    return response
```

---

## 📁 Dateistruktur

```
backend/app/services/scripts/
├── __init__.py              # Exports
├── models.py                # Datenmodelle (Script, ScriptCategory, etc.)
├── disg_adapter.py          # DISG-Anpassungs-Logik
├── service.py               # Haupt-Service
└── network_marketing_scripts.py  # Alle 52 Scripts

backend/app/api/
├── routes/scripts.py        # API-Endpunkte
└── schemas/scripts.py       # Pydantic Models

backend/migrations/
└── 081_create_scripts_library.sql  # DB-Schema
```

---

## 🚀 Quick Start

### 1. Migration ausführen

```bash
cd src/backend
python run_migration.py 081_create_scripts_library.sql
```

### 2. Scripts seeden

```bash
python -m app.seeds.scripts_seed --force
```

### 3. API testen

```bash
curl "http://localhost:8000/api/v2/scripts?category=einwand&disg=S"
```

---

## 📈 Performance-Tracking

Die Library trackt automatisch:

| Metrik | Beschreibung |
|--------|--------------|
| `usage_count` | Wie oft verwendet |
| `reply_rate` | % die geantwortet haben |
| `positive_rate` | % positive Antworten |
| `conversion_rate` | % Konversionen |
| `best_for_disg` | Welcher DISG-Typ am besten |
| `best_for_channel` | Welcher Kanal am besten |

### Top-Scripts abrufen

```http
GET /scripts/top/performing?metric=conversion_rate&limit=5
```

---

## 🔮 Roadmap

- [ ] **A/B Testing** - Automatische Script-Varianten testen
- [ ] **AI Script Generator** - Neue Scripts generieren lassen
- [ ] **Voice-Optimierung** - Scripts für Sprachausgabe optimieren
- [ ] **Multi-Language** - Englische, Spanische Scripts
- [ ] **Industry Templates** - Scripts für andere Verticals

---

> **SALESFLOW AI** | Script Library v2.0 | Dezember 2025

