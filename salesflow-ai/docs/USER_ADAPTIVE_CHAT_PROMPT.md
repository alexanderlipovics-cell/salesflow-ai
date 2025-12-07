# 🎯 User-Adaptive Chat Prompt - Personalisierung für jeden User

## Übersicht

Das **User-Adaptive Chat Prompt System** ermöglicht es dem AI Chat, von jedem User zu lernen und sich individuell anzupassen. Jeder User bekommt personalisierte Antworten basierend auf:

- **Kommunikationsstil** (Tone, Formality, Emoji-Usage)
- **Sales-Style** (aggressiv, balanced, consultative)
- **Erfolgreiche Patterns** aus vergangenen Interaktionen
- **Präferenzen** aus dem User Learning Profile

---

## 🏗️ Architektur

### Komponenten

1. **`user_adaptive_prompts.py`** - Core-Modul für Prompt-Personalisierung
2. **`user_learning_profile` Tabelle** - Speichert User-Präferenzen
3. **Chat Router Integration** - Nutzt personalisierte Prompts automatisch

### Datenfluss

```
User Chat Request
    ↓
Chat Router (/api/chat/completion)
    ↓
Lade User Learning Profile aus DB
    ↓
Baue personalisierten System-Prompt
    ↓
OpenAI API mit personalisiertem Prompt
    ↓
Personalisierte Antwort für User
```

---

## 📊 User Learning Profile

Die Tabelle `user_learning_profile` speichert:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `user_id` | UUID | User-Identifikation |
| `preferred_tone` | TEXT | professional, friendly, casual, formal |
| `avg_message_length` | INTEGER | Durchschnittliche Nachrichtenlänge |
| `emoji_usage_level` | INTEGER | 0-5 (0=keine, 5=viele) |
| `formality_score` | DECIMAL | 0.0-1.0 (0=informell, 1=formal) |
| `sales_style` | TEXT | aggressive, balanced, consultative |
| `objection_handling_strength` | DECIMAL | 0.0-1.0 |
| `closing_aggressiveness` | DECIMAL | 0.0-1.0 |
| `top_script_ids` | JSONB | Array von erfolgreichen Script-IDs |
| `successful_patterns` | JSONB | Array von erfolgreichen Strategien |

---

## 🚀 Verwendung

### Automatisch (Standard)

Der Chat Router nutzt automatisch personalisierte Prompts:

```python
# In backend/app/routers/chat.py
# Wird automatisch ausgeführt bei jedem Chat-Request
user_context = await load_user_learning_context(user_id, db_client)
system_prompt = build_user_adaptive_prompt(
    base_prompt=SALES_COACH_PROMPT,
    user_context=user_context,
    lead_context=lead_context,
)
```

### Manuell

```python
from app.core.user_adaptive_prompts import (
    get_adaptive_chat_prompt,
    load_user_learning_context,
    build_user_adaptive_prompt,
)

# Lade User Context
user_context = await load_user_learning_context(user_id, db_client)

# Baue personalisierten Prompt
prompt = build_user_adaptive_prompt(
    base_prompt="Du bist ein Sales Coach...",
    user_context=user_context,
    lead_context={"name": "Max Mustermann", "status": "hot"},
)
```

---

## 🎨 Personalisierungs-Features

### 1. Kommunikationsstil

**Tone-Anpassung:**
- `professional`: Professionell, aber freundlich
- `friendly`: Sehr freundlich und nahbar
- `casual`: Locker und ungezwungen
- `formal`: Sehr formell und respektvoll

**Formality-Score:**
- `< 0.3`: Sehr informell - kurze, lockere Sätze
- `> 0.7`: Formell - vollständige Sätze, höfliche Formulierungen

**Emoji-Usage:**
- `0`: Keine Emojis
- `1-2`: Sparsam (1-2 pro Nachricht)
- `3-4`: Normal (2-3 pro Nachricht)
- `5`: Viele (4+ pro Nachricht)

### 2. Sales-Style

**Aggressive:**
- Direkte Calls-to-Action
- Klare Deadlines
- Starker Fokus auf Abschluss

**Balanced:**
- Balance zwischen Beziehung und Abschluss
- Biete Wert, führe zum nächsten Schritt

**Consultative:**
- Fokus auf Problemlösung
- Baue Vertrauen auf, bevor du zum Abschluss führst

### 3. Erfolgreiche Patterns

Das System lernt aus erfolgreichen Interaktionen:
- Welche Scripts funktionieren?
- Welche Strategien führen zu Conversions?
- Welche Ansätze passen zu diesem User?

---

## 📝 Beispiel-Prompt

### Vorher (Standard):
```
Du bist ein erfahrener Sales Coach und hilfst bei der Optimierung 
von Verkaufsgesprächen und Lead-Qualifizierung.
```

### Nachher (Personalisierter):
```
Du bist ein erfahrener Sales Coach und hilfst bei der Optimierung 
von Verkaufsgesprächen und Lead-Qualifizierung.

═══════════════════════════════════════
PERSONALISIERTE ANPASSUNGEN:
═══════════════════════════════════════
Du kommunizierst mit Max Mustermann.
Der User arbeitet bei/in: PM International.
Branche: network_marketing.

Kommunikationsstil: Sehr freundlich und nahbar. Nutze 'du' und sei warmherzig.
Emoji-Nutzung: Moderate Emoji-Nutzung (1-2 pro Nachricht).
Halte Nachrichten kurz und prägnant (max. 2-3 Sätze).

Ausgewogener Sales-Style: Balance zwischen Beziehung und Abschluss. 
Biete Wert, aber führe auch zum nächsten Schritt.
Sanfter Abschluss - lass dem Lead Zeit, aber biete klare Optionen.

Erfolgreiche Ansätze dieses Users (nutze ähnliche Strategien):
- Storytelling mit persönlichen Erfahrungen
- Social Proof durch Erfolgsgeschichten
- Soft Close mit Optionen

Lead-Kontext:
Lead: Anna Schmidt
Status: hot
Score: 85
Letzter Kontakt: 2025-01-15
```

---

## 🔄 Learning & Anpassung

### Automatisches Lernen

Das System lernt automatisch aus:
- **Erfolgreichen Conversions**: Welche Strategien funktionieren?
- **User-Feedback**: Welche Antworten werden positiv bewertet?
- **Verwendeten Scripts**: Welche Scripts nutzt der User häufig?
- **Bearbeiteten Antworten**: Wie passt der User AI-Antworten an?

### Manuelle Anpassung

User können ihr Profil manuell anpassen über:
- Settings → AI Preferences
- API: `PUT /api/collective-intelligence/profile`

---

## 🛠️ Integration

### Backend

```python
# backend/app/routers/chat.py
from app.core.user_adaptive_prompts import (
    load_user_learning_context,
    build_user_adaptive_prompt,
)

# In chat_completion():
user_context = await load_user_learning_context(user_id, db_client)
system_prompt = build_user_adaptive_prompt(
    base_prompt=base_prompt,
    user_context=user_context,
    lead_context=lead_context,
)
```

### Frontend

Das Frontend muss nichts ändern - Personalisierung passiert automatisch im Backend.

---

## 📈 Metriken & Tracking

Das System trackt:
- **Conversion Rate** pro User
- **Response Quality** (User-Ratings)
- **Pattern Success Rate** (welche Strategien funktionieren?)
- **Adaptation Speed** (wie schnell passt sich der Chat an?)

---

## 🔒 Privacy & Opt-Out

User können:
- **Opt-Out** aus kollektivem Lernen (nur lokales Lernen)
- **Bestimmte Kontakte ausschließen** (keine Daten für diese Kontakte)
- **Profil zurücksetzen** (alle Präferenzen löschen)

---

## ✅ Checkliste

- [x] User Learning Profile Tabelle vorhanden
- [x] `user_adaptive_prompts.py` Modul erstellt
- [x] Chat Router Integration
- [ ] Frontend Settings für User-Präferenzen
- [ ] Automatisches Learning aus Conversions
- [ ] Analytics Dashboard für Personalisierung

---

## 🚀 Nächste Schritte

1. **User-Präferenzen UI** - Frontend für Einstellungen
2. **Automatisches Learning** - Aus Conversions lernen
3. **A/B Testing** - Personalisierung vs. Standard testen
4. **Analytics** - Metriken für Personalisierung

---

## 📚 Weitere Ressourcen

- `backend/app/core/user_adaptive_prompts.py` - Core-Modul
- `backend/app/routers/chat.py` - Chat Router Integration
- `supabase/migrations/20251205_NON_PLUS_ULTRA_collective_intelligence.sql` - DB Schema

