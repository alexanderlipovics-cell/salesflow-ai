# 🧠 CHIEF AI OPERATING SYSTEM - v3.1 ADDITIONS

> **Version:** 3.1  
> **Stand:** Dezember 2024  
> **Status:** ✅ Implementiert

---

## Was in v3.1 neu ist

Diese Version ergänzt das bestehende v3.0 System um **8 neue spezialisierte Prompts** für Enterprise-Level Performance.

---

## Übersicht: v3.1 Additions

| # | Modul | Datei | Beschreibung |
|---|-------|-------|--------------|
| 1 | **Enterprise Mode** | `chief_v31_additions.py` | Compliance & Brand Voice für Firmen |
| 2 | **Revenue Engineer** | `chief_v31_additions.py` | Goal-Driven Activity Management |
| 3 | **Signal Detector** | `chief_v31_additions.py` | Einwand vs. Vorwand Erkennung |
| 4 | **Closer Library** | `chief_v31_additions.py` | Killer-Phrasen zum Kopieren |
| 5 | **Natural Selection** | `chief_v31_additions.py` | Auto Best Practice Verteilung |
| 6 | **Personality Matching** | `chief_v31_additions.py` | DISG-basierte Kommunikation |
| 7 | **Industry Module** | `chief_v31_additions.py` | Modulare Branchen-Templates |
| 8 | **Deal Medic** | `chief_v31_additions.py` | Post-Mortem Analyse |

---

## 1. 🏢 Enterprise Mode - Compliance & Brand Voice

### Zweck
Aktiviert Compliance-Checks und Brand Voice Enforcement für Firmen mit Vertriebsteams.

### Hierarchie-Modi

| Mode | Beschreibung | CHIEF-Verhalten |
|------|--------------|-----------------|
| **SOLO** | Keine Firma, Einzelkämpfer | Volle Freiheit, keine Checks |
| **NETWORK_TEAM** | MLM mit Upline | Respektiert Upline-Templates |
| **ENTERPRISE** | Firma mit Team | Compliance-Enforcer |

### Compliance Engine

```python
from chief_v31_additions import ComplianceRules, check_compliance

rules = ComplianceRules(
    forbidden_words=["garantiert", "heilt", "100%"],
    required_disclaimers={
        "health_claims": "Dies ist keine medizinische Beratung.",
        "income_claims": "Ergebnisse können variieren."
    },
    max_income_claim=None,  # Keine Einkommensversprechen erlaubt
    tone="professional",
)

result = check_compliance("Das Produkt heilt garantiert!", rules)
# result.is_compliant = False
# result.violations = [{"type": "forbidden_word", "word": "garantiert"}, ...]
```

### Brand Voice

```python
from chief_v31_additions import BrandVoice

brand = BrandVoice(
    personality="Freundlich-professionell",
    forbidden_phrases=["Hammer Angebot", "Mega geil"],
    preferred_phrases=["Wir freuen uns...", "Das klingt spannend!"],
    emoji_policy="minimal",  # none, minimal, friendly
    formality="Du",          # Du, Sie, context-dependent
    response_length="concise",
)
```

---

## 2. 📊 Revenue Engineer - Goal-Driven Activity

### Zweck
Rechnet vom Monatsziel rückwärts und sagt dem User GENAU was er täglich tun muss.

### Berechnung

```python
from chief_v31_additions import UserGoal, calculate_daily_targets

goal = UserGoal(
    monthly_target=3000,
    days_remaining=10,
    current_revenue=1800,
    avg_deal_size=95,
    conversion_rates={
        "outreach_to_reply": 0.30,
        "reply_to_meeting": 0.50,
        "meeting_to_close": 0.25,
    }
)

targets = calculate_daily_targets(goal)
# targets.revenue_gap = 1200
# targets.deals_needed = 13
# targets.daily_outreach_required = 35
# targets.on_track = False (wenn > Kapazität)
```

### Output-Formate

**Morgen-Push:**
```
☀️ GUTEN MORGEN!

Status: Tag 15 von 30 | €1.800 von €3.000 (60%)
Erwartung bei gleichem Tempo: €2.700 ❌

UM AUF KURS ZU KOMMEN:
Heute brauchst du 2 Deals.

DEIN PLAN FÜR HEUTE:
1. ⏰ 09:00 - 5 Follow-ups von gestern
2. ⏰ 10:00 - 20 neue Outreaches
3. ⏰ 14:00 - Gespräch mit Anna
4. ⏰ 16:00 - Nachhaken bei Thomas

[LET'S GO!]
```

---

## 3. 🎯 Signal Detector - Einwand vs. Vorwand

### Zweck
Unterscheidet ob ein Kunde einen echten Einwand hat oder einen Vorwand nutzt.

### Pattern Recognition

| Einwand | ECHT wenn... | VORWAND wenn... |
|---------|--------------|-----------------|
| "Zu teuer" | Budget genannt, fragt nach Alternativen | Nie nach Preis gefragt, war skeptisch |
| "Keine Zeit" | Erklärt konkret warum, schlägt Termin vor | Vage "busy", kein Gegenvorschlag |
| "Muss überlegen" | Hat offene Fragen, will Unterlagen | Keine Fragen, vermeidet Commitment |

### Usage

```python
from chief_v31_additions import analyze_objection

context = {
    "asked_about_price": False,
    "budget_mentioned": False,
    "engagement_level": "medium",
}

analysis = analyze_objection("Das ist mir zu teuer", context)
# analysis.objection_type = ObjectionType.PRETENSE (75% confidence)
# analysis.real_problem = "Vermutlich VERTRAUEN"
# analysis.recommended_response = "Angenommen der Preis wäre kein Thema..."
```

---

## 4. 🔥 Closer Library - Killer Phrases

### Zweck
Liefert EXAKTE Sätze die Deals closen. Keine Tipps - SÄTZE zum Kopieren.

### Situationen

| Situation | Beschreibung |
|-----------|--------------|
| `HESITATION` | Kunde zögert, hat aber Interesse |
| `PRICE_OBJECTION` | Sagt "zu teuer" |
| `TIME_OBJECTION` | Sagt "keine Zeit" |
| `GHOST_RISK` | Droht zu ghosten |
| `READY_TO_CLOSE` | Bereit, braucht letzten Push |

### Top Killer Phrases

**Bei Zögern:**
```
"Stell dir vor es ist in 3 Monaten und [Problem] ist gelöst. 
Wie fühlt sich das an? ... Was hindert dich, das jetzt zu starten?"
```

**Bei "zu teuer":**
```
"Wenn Geld keine Rolle spielen würde - würdest du's machen?"
→ WENN JA: "Okay, dann ist es nur eine Frage der Zahlung."
→ WENN NEIN: "Was ist es dann wirklich?"
```

**Bei Ghost-Risiko:**
```
"Weißt du was - vielleicht ist gerade nicht der richtige Zeitpunkt für dich. 
Meld dich wenn sich das ändert!"
```

### Usage

```python
from chief_v31_additions import ClosingSituation, get_best_killer_phrase

phrase = get_best_killer_phrase(ClosingSituation.PRICE_OBJECTION)
# phrase["name"] = "Der Reality Check"
# phrase["phrase"] = "Wenn Geld keine Rolle spielen würde..."
```

---

## 5. 🧬 Natural Selection - Auto Best Practice

### Zweck
Identifiziert was funktioniert und verbreitet es automatisch im Team.

### Override Learning

```
CHIEF schlägt vor: "Hey [Name], wie geht's dir?"
User ändert zu: "Yo [Name]! Krasser Post gestern 🔥"
User sendet SEINE Version
Lead antwortet positiv
→ Das ist ein ERFOLGREICHER OVERRIDE
```

### Learning Logic

1. Nur von erfolgreichen Pros lernen (professional/expert)
2. Outcome muss besser sein als CHIEF's Original
3. Pattern muss sich wiederholen (>3x)
4. Dann: Als "Emerging Best Practice" markieren

### Usage

```python
from chief_v31_additions import OverrideEvent, evaluate_override

override = OverrideEvent(
    original_suggestion="Hey, wie geht's?",
    user_override="Yo! Krasser Post gestern 🔥",
    user_level="professional",
    outcome="reply_received",
    outcome_quality="positive",
    lead_type="cold_outreach",
    channel="instagram_dm",
    time_to_response=2.5,
)

result = evaluate_override(override)
# result["action"] = "learn"
# result["distribute_to"] = ["practitioner", "starter"]
```

---

## 6. 🎭 Personality Matching - DISG

### Zweck
Erkennt den Kommunikationsstil des Leads und passt Antworten an.

### DISG-Typen

| Typ | Emoji | Erkennung | Anpassung |
|-----|-------|-----------|-----------|
| **D (Dominant)** | 🔴 | Kurz, direkt, keine Emojis | 2-4 Sätze, Fakten, kein Smalltalk |
| **I (Initiativ)** | 🟡 | Enthusiastisch, viele Emojis | Matching-Energie, Storytelling |
| **S (Stetig)** | 🟢 | Höflich, viele Fragen | Geduldig, Sicherheit geben |
| **G (Gewissenhaft)** | 🔵 | Detail-Fragen, Fakten-Fokus | Zahlen, Quellen, keine Emojis |

### Usage

```python
from chief_v31_additions import detect_personality_type, adapt_message_to_personality

messages = [
    "Was kostet das?",
    "Kurz und knapp bitte",
    "Komm zum Punkt"
]

profile = detect_personality_type(messages)
# profile.primary_type = DISGType.D (Dominant)
# profile.confidence = 0.85
# profile.signals = ["Kurze Nachrichten", "Keine Emojis", "Direkte Fragen"]

# Nachricht anpassen
adapted = adapt_message_to_personality(
    "Hier ist eine ausführliche Erklärung unseres Produkts...",
    profile
)
# → Gekürzte, direktere Version
```

---

## 7. 🏭 Industry Module - Branchen-Templates

### Zweck
Modulare, branchenspezifische Sales Intelligence.

### Verfügbare Module

| ID | Name | Status |
|----|------|--------|
| `health_wellness` | Health & Wellness | ✅ Live |
| `real_estate` | Immobilien | ✅ Live |
| `finance` | Finanzdienstleistungen | ✅ Live |
| `insurance` | Versicherungen | 🔨 Geplant |
| `b2b_saas` | B2B SaaS | 🔨 Geplant |
| `coaching` | Coaching & Training | 🔨 Geplant |

### Module Struktur

```python
from chief_v31_additions import load_industry_module

module = load_industry_module("health_wellness")
# module.common_objections = [{"objection": "Wirkt das wirklich?", ...}]
# module.compliance_rules = {"forbidden": ["heilt", "garantiert"], ...}
# module.customer_pain_points = ["Energie", "Schlaf", ...]
# module.testimonial_templates = ["Früher hatte ich {pain_point}..."]
```

---

## 8. 💔 Deal Medic - Post-Mortem Analyse

### Zweck
Analysiert WARUM Deals gestorben sind und gibt konkretes Feedback.

### Trigger

- Lead Status → "lost"
- Längere Konversation (>5 Messages) ohne Abschluss
- User requested Analyse

### Output Formate

**Quick Analysis:**
```
💔 DEAL ANALYSE: Anna

TODESURSACHE: Preis-Einwand unbehandelt

WAS PASSIERT IST:
Anna sagte "zu teuer", du hast aufgegeben.

WAS DU HÄTTEST TUN KÖNNEN:
"Verstehe. Mal angenommen der Preis passt - wärst du dabei?"

LEARNING:
Bei "zu teuer" - IMMER nachhaken ob es WIRKLICH der Preis ist.
```

**Proaktive Intervention:**
```
⚠️ DEAL IN GEFAHR

Anna hat 2 Warnsignale:
• Antworten werden kürzer
• Hat "muss überlegen" gesagt

INTERVENTION JETZT:
Sende: "Hey Anna, ich merk du bist noch unsicher.
Was würde dir helfen, eine Entscheidung zu treffen?"

[Jetzt senden] [Andere Option]
```

### Usage

```python
from chief_v31_additions import detect_deal_at_risk, analyze_lost_deal

# Prüfen ob Deal in Gefahr
risk = detect_deal_at_risk(lead_id, conversation_history)
if risk:
    print(risk["warnings"])
    print(risk["intervention_message"])

# Post-Mortem nach Verlust
pm = analyze_lost_deal("Anna", conversation_history)
# pm.death_cause = "ZU FRÜHER PITCH"
# pm.critical_errors = [{"name": "...", "better": "..."}]
# pm.learnings = ["Vor JEDEM Pitch sicherstellen..."]
```

---

## Integration in chief_context.py

### Neue Funktionen

```python
from services.chief_context import (
    build_chief_v31_context,
    get_closing_help,
    analyze_objection_with_context,
    check_deal_health,
    get_deal_post_mortem,
)

# Vollständigen V3.1 Kontext bauen
context = await build_chief_v31_context(
    db=supabase,
    user_id="user-123",
    company_id="company-456",
    lead_id="lead-789",  # Für Personality Matching
    include_goals=True,
    include_personality=True,
)

# context.company_mode
# context.compliance_rules
# context.user_goal
# context.daily_targets
# context.lead_personality
# context.formatted_prompt  # Fertiger Prompt-Text
```

---

## Gesamt-System: v3.0 + v3.1

### v3.0 Prompts (11)

| Prompt | Datei |
|--------|-------|
| CHIEF_SYSTEM_PROMPT v3.0 | `chief_v3_core.py` |
| CHIEF_DRIVER_PROMPT | `chief_driver.py` |
| CHIEF_COACH_PROMPT v3.0 | `chief_v3_core.py` |
| CHIEF_ANALYST_PROMPT | `chief_v3_core.py` |
| LIVE_ASSIST_PROMPT v3.0 | `live_assist_prompt.py` |
| CHIEF_MEMORY_PROMPT | `chief_living_os.py` |
| BEHAVIORAL_ANALYSIS v3.0 | `behavioral_analysis.py` |
| GHOST_BUSTER v3.0 | `chief_workflow.py` |
| CHIEF_TAX_COACH v3.0 | `chief_tax_coach.py` |
| CHIEF_TEAM_LEADER_PROMPT | `chief_v3_core.py` |
| CHIEF_ONBOARDING_PROMPT | `chief_advanced.py` |

### v3.1 Additions (8)

| Prompt | Datei |
|--------|-------|
| CHIEF_ENTERPRISE_PROMPT | `chief_v31_additions.py` |
| CHIEF_REVENUE_ENGINEER_PROMPT | `chief_v31_additions.py` |
| CHIEF_SIGNAL_DETECTOR_PROMPT | `chief_v31_additions.py` |
| CHIEF_CLOSER_LIBRARY_PROMPT | `chief_v31_additions.py` |
| CHIEF_NATURAL_SELECTION_PROMPT | `chief_v31_additions.py` |
| CHIEF_PERSONALITY_MATCHING_PROMPT | `chief_v31_additions.py` |
| CHIEF_INDUSTRY_MODULE_PROMPT | `chief_v31_additions.py` |
| CHIEF_DEAL_MEDIC_PROMPT | `chief_v31_additions.py` |

### **TOTAL: 19 SPECIALIZED PROMPTS**

---

## Der Game-Changer Satz

**Von:**
> "Hier ist eine Antwort, die du nutzen kannst."

**Zu:**
> "Ich habe analysiert, dass dieser Lead (D-Typ, preissensitiv) kaufbereit ist. 
> Hier ist der exakte Satz den unser Top-Performer gestern in der gleichen Situation genutzt hat.
> Sende ihn jetzt, um dein Tagesziel von €150 zu erreichen.
> Du brauchst noch 2 Deals heute."

---

*CHIEF v3.1 - The AI Sales Operating System*

