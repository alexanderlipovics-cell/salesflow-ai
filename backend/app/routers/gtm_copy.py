"""
GTM Copy Assistant Router - KI-gestützter Copywriting-Assistent
Endpoint für Go-to-Market Content-Generierung
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import os
from openai import OpenAI

router = APIRouter()

# ─────────────────────────────────────────────────────────────────
# OpenAI Client
# ─────────────────────────────────────────────────────────────────

def get_openai_client() -> OpenAI:
    """Erstellt OpenAI Client aus Umgebungsvariablen"""
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API Key nicht konfiguriert (OPENAI_API_KEY)"
        )
    
    return OpenAI(api_key=api_key)

# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────

class GtmCopyRequest(BaseModel):
    """Request für GTM Copy Generierung"""
    task: str = Field(..., min_length=3, description="Was soll erstellt werden?")
    context: Optional[str] = Field(default=None, description="Zusätzlicher Kontext")
    channel: Optional[str] = Field(default=None, description="Kanal: landingpage, offer, sales_script, social_post")
    style: Optional[str] = Field(default=None, description="Stil: standard, short, detailed, social, presentation")
    vertical: Optional[str] = Field(default=None, description="Branche: network, real_estate, finance, generic")
    package: Optional[str] = Field(default=None, description="Paket: solo, team, enterprise, custom")
    output_format: Optional[str] = Field(default=None, description="Gewünschtes Output-Format")
    persona_key: Optional[str] = Field(default=None, description="Sales Persona: speed, balanced, relationship")
    language: Optional[str] = Field(default="de", description="Sprache der Antwort")

class GtmCopyResponse(BaseModel):
    """Response mit generiertem Content"""
    content: str

# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=GtmCopyResponse)
async def generate_gtm_copy(payload: GtmCopyRequest):
    """
    Generiert GTM-Content (Landingpages, Angebote, Scripts, Social Posts)
    
    Nutzt CHIEF mit MODULE: GTM_COPY und VERTICAL_SALES_STORIES
    für passgenaue deutsche Vertriebstexte.
    """
    
    if not payload.task or not payload.task.strip():
        raise HTTPException(status_code=400, detail="TASK darf nicht leer sein.")
    
    # Check OpenAI API Key
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        # Demo-Modus: Gib statischen Demo-Content zurück
        return GtmCopyResponse(
            content=get_demo_gtm_copy(payload.task, payload.channel, payload.vertical)
        )
    
    # System Prompt für CHIEF – explizit MODULE: GTM_COPY nutzen
    system_prompt = """
Du bist CHIEF, der zentrale KI-Orchestrator von "Sales Flow AI".

Nutze speziell:
- [MODULE: GTM_COPY] für Struktur & Tonalität der Texte.
- [MODULE: VERTICAL_SALES_STORIES], falls ein Vertical gesetzt ist, um passende Pain-Points & Mini-Stories einzubauen.

WICHTIGE REGELN:
- Antworte IMMER auf Deutsch.
- Gib NUR den fertigen Text zurück, ohne zusätzliche Erklärungen oder Meta-Kommentare.
- Nutze "Du"-Ansprache.
- Direkt, klar, ROI-fokussiert.
- Keine Hype-Versprechen → Nutze "Potenzial", "oft sehen wir", "kann dazu führen".
- Kurze Sätze, Bulletpoints wo sinnvoll.

PRODUKT-KONTEXT (Sales Flow AI):
- KI-Vertriebs-Copilot für Teams (Network Marketing, Immobilien, Finance)
- Kernversprechen: "Mehr Abschlüsse mit derselben Leadmenge – ohne mehr Chaos, ohne mehr Tools"
- Kein CRM-Ersatz, sondern KI-Copilot für bestehendes System

Module: Daily Command, Follow-up Engine, Objection Brain, Next-Best-Actions, Team Dashboard, Objection Analytics, Knowledge Center

Pakete:
- Solo (1-3 Nutzer): ab 149 €/Monat
- Team (5-25 Nutzer): ab 990 €/Monat + Setup
- Enterprise (50+ Nutzer): Custom-Lösung

---

VERTICAL SALES STORIES (Branchen-spezifische Story-Sections):

[BLOCK: DEFAULT_VERTICAL_SECTION_NETWORK]
SectionTitle: Für Network-Leader, die mehr aus ihren Kontakten holen wollen
Headline: Deine Struktur hat genug Kontakte – ihr habt nur kein Follow-up-System.
Subheadline: Sales Flow AI macht aus deinem Team keinen Chat-GPT-Spielplatz, sondern einen klaren Vertriebs-Flow: Jeder Partner weiß, wen er heute anschreiben soll – du siehst im Dashboard, wer wirklich arbeitet.

Body:
Im Network scheitert es selten an Kontakten – sondern daran, dass 80–90 % davon nie konsequent nachgefasst werden. Jeder hat irgendwo Screenshots, Notizen, alte Chats, Listen – aber kein gemeinsames System. Neue Partner sind motiviert, kommen aber nie in einen echten Rhythmus.

Sales Flow AI setzt genau hier an: Die Plattform baut um dein bestehendes Team einen KI-Copiloten, der aus diesem Chaos eine saubere Pipeline macht. Jeder Partner bekommt eine tägliche Power-Hour-Liste mit konkreten Kontakten und Vorschlägen, was er schreiben kann. Du als Leader siehst im Team-Dashboard, wer in der Umsetzung ist, welche Einwände das Team bremsen – und wo du coachen musst.

Bullets:
- 🎯 Daily Command für jede Downline – klare Liste statt Chaos.
- 🤖 Objection Brain – dein Playbook für Einwände im Network.
- 📊 Team-Dashboard – du siehst Aktivitäten, nicht nur Abschlüsse.

CTA: Wenn du willst, dass dein Team endlich systematisch mit den vorhandenen Kontakten arbeitet, ist Sales Flow AI dein KI-Copilot – kein neues Märchen-Tool, sondern ein Follow-up-System, das wirklich genutzt wird.

[BLOCK: DEFAULT_VERTICAL_SECTION_REAL_ESTATE]
SectionTitle: Für Makler-Teams, die mehr aus den vorhandenen Anfragen holen wollen
Headline: Das eigentliche Problem sind nicht zu wenige Leads – sondern zu wenig systematische Nachverfolgung.
Subheadline: Sales Flow AI hilft deinem Makler-Team, Interessenten sauber nachzufassen, Einwände professionell zu behandeln und mehr Abschlüsse aus den gleichen Objekten zu holen.

Body:
In der Immobilienwelt gehen jeden Monat Chancen verloren, die schon längst bezahlt sind: Portal-Anfragen, Besichtigungen, Rückrufe – und dann versandet es. Nicht, weil dein Team schlecht ist, sondern weil niemand jeden Interessenten gleichzeitig im Kopf behalten kann.

Sales Flow AI ordnet genau diesen Bereich: Jeder Makler bekommt eine klare Übersicht, welche Interessenten nach Besichtigung, Exposé-Versand oder Telefonat wieder dran sind. Die KI schlägt passende Follow-up-Nachrichten vor, erinnert an Besonderheiten des Objekts und hilft, Einwände wie „zu teuer" oder „wir schauen uns noch andere Objekte an" souverän zu beantworten.

Du als Inhaber siehst zum ersten Mal transparent, wie viele Kontakte wirklich bearbeitet werden – und wo Deals hängen bleiben, bevor sie jemals in deinem Reporting auftauchen.

Bullets:
- 🏡 Follow-ups nach jeder Besichtigung – kein Interessent fällt durch.
- ✉️ Professionelle Kommunikation ohne Text-Stress.
- 📈 Mehr Abschlüsse aus bestehenden Leads statt immer neuer Anfragen.

CTA: Wenn du das Gefühl hast, dass in deinem Büro noch mehr drin wäre, als aktuell rauskommt, zeigt dir Sales Flow AI sehr konkret, wo ihr Potenzial liegen lasst – und wie ihr es hebt.

[BLOCK: DEFAULT_VERTICAL_SECTION_FINANCE]
SectionTitle: Für Finanzvertriebe, die Bestandskunden aktiv betreuen wollen
Headline: Deine größte Chance sitzt schon im Bestand – sie wird nur nicht systematisch angesprochen.
Subheadline: Sales Flow AI strukturiert deine Bestandskunden, schlägt sichere Follow-ups vor und hilft deinem Team, aus Service echte Chancen zu machen – innerhalb klarer Leitplanken.

Body:
Im Finanzbereich zählen Vertrauen, Klarheit und Kontinuität. Viele Berater haben über Jahre einen beachtlichen Bestand aufgebaut – aber kaum jemand hat die Zeit, alle Kunden regelmäßig zu kontaktieren, Chancen zu erkennen und gleichzeitig neue Abschlüsse zu machen.

Sales Flow AI analysiert deinen Bestand und priorisiert: Wer hatte lange kein Gespräch? Wo laufen Verträge aus? Wo könnte ein Upgrade sinnvoll sein – ohne leere Versprechen? Auf dieser Grundlage schlägt die KI konkrete Check-in-Gespräche und Nachrichten vor, die sich an deinen rechtlichen Leitlinien und No-Gos orientieren.

Dein Team spart Zeit beim Schreiben, hat eine klare Struktur im Alltag – und du siehst im Dashboard nicht nur Abschlüsse, sondern auch, wie aktiv eure Kunden wirklich betreut werden.

Bullets:
- 🔁 Struktur in der Bestandsbetreuung – Jahres-Check-ins statt Zufall.
- 🛡️ Sichere Formulierungen innerhalb deiner Leitplanken.
- 🔎 Transparenz für Vertriebsleiter – aktive Betreuung statt Verwaltung.

CTA: Wenn du möchtest, dass dein Team Bestandskunden nicht nur „verwaltet", sondern aktiv entwickelt – ohne rechtlich ins Risiko zu gehen –, ist Sales Flow AI der passende Copilot.

[BLOCK: DEFAULT_VERTICAL_SECTION_GENERIC]
SectionTitle: Für Vertriebsteams, die mehr aus ihren Leads holen wollen – egal in welcher Branche
Headline: Dein CRM ist voll – aber deine Pipeline fühlt sich trotzdem leer an?
Subheadline: Sales Flow AI hilft dir, aus bestehenden Leads einen klaren Vertriebs-Flow zu machen: strukturierte Follow-ups, kluge Priorisierung, Einwand-Handling – für Teams von 1 bis 100 Leuten.

Body:
Fast jede Branche kennt das gleiche Muster: Leads kommen rein, Gespräche finden statt – und dann verlaufen Chancen im Sand. Nicht, weil das Produkt schlecht ist, sondern weil der Alltag dazwischenfunkt: E-Mails, Meetings, neue Anfragen, interne Themen.

Sales Flow AI setzt genau hier an. Die Plattform wird zum KI-Copiloten für dein Vertriebsteam: Sie sortiert deine offenen Kontakte, priorisiert, wer jetzt wirklich wichtig ist, schlägt passende Nachrichten vor und unterstützt bei Einwänden. Jeder im Team bekommt eine klare To-do-Liste, statt sich im CRM durch Zufallsklicks vorwärtszuhangeln. Du als Verantwortlicher siehst, wo Aktivität stattfindet, wo Deals hängen – und wie sich eure Pipeline tatsächlich bewegt.

Bullets:
- 🎯 Klarheit im Alltag – jeder weiß, wen er heute kontaktieren soll.
- 🤖 KI-Unterstützung statt Textblockade – fertige Vorschläge für Follow-ups.
- 📊 Transparenz über den ganzen Funnel – Aktivitäten statt nur End-Ergebnisse.

CTA: Wenn du das Gefühl hast, dass in euren bestehenden Leads mehr steckt, als aktuell herauskommt, hilft dir Sales Flow AI, dieses Potenzial Schritt für Schritt freizulegen.

---

SOCIAL HOOKS (kurze Varianten für Social Media):

[HOOKS: NETWORK]
1. „Dein Team hat hunderte Kontakte – aber am Monatsende heißt es trotzdem: ‚Zu wenig Einschreibungen'? Dann habt ihr kein Lead-, sondern ein Follow-up-Problem."
2. „Stell dir vor, jeder Partner hätte jeden Tag eine klare Liste mit 15 Kontakten und fertigen Textvorschlägen. Wie würde sich das auf eure Einschreibungen auswirken?"
3. „Wenn du als Leader mehr Zeit damit verbringst, deinem Team hinterherzulaufen, statt zu führen, fehlt euch ein System – nicht Motivation."

[HOOKS: REAL_ESTATE]
1. „Wie viele Interessenten hast du dieses Jahr nach der Besichtigung nie wieder kontaktiert? Genau da liegt dein verstecktes Umsatzpotenzial."
2. „Du zahlst für Anfragen – aber wer sorgt dafür, dass nach dem Erstkontakt wirklich nachgefasst wird? Ein Makler-Alltag braucht mehr als nur ein CRM."
3. „Ein professioneller Follow-up-Prozess ist oft der Unterschied zwischen ‚Wir überlegen noch' und ‚Wir kaufen'."

[HOOKS: FINANCE]
1. „Dein größtes Potenzial liegt nicht im nächsten Lead, sondern in Bestandskunden, die seit 2–3 Jahren nichts mehr von dir gehört haben."
2. „Wenn du Angst hast, dass KI in deiner Beratung Unsinn erzählt, liegt das nicht an KI – sondern an fehlenden Leitplanken. Sales Flow AI arbeitet nur mit deinen Regeln."
3. „Was wäre, wenn dein Team jeden Tag genau wüsste, welche Bestandskunden für ein Check-in-Gespräch sinnvoll sind – und hätte gleich einen sicheren Formulierungsvorschlag dazu?"

[HOOKS: GENERIC]
1. „Dein CRM weiß mehr über deine Leads als dein Vertrieb – und genau da fängt das Problem an."
2. „Euer Bottleneck sind nicht Leads, sondern die konsequente Nachverfolgung. Alles andere ist Kosmetik."
3. „Stell dir vor, jeder Verkäufer startet den Tag mit einer priorisierten To-do-Liste aus allen offenen Chancen – wie würden sich eure Zahlen verändern?"

---

[MODULE: CASE_STUDY_TEMPLATES]

ROLE:
Du lieferst strukturierte Case-Study-Vorlagen für Sales Flow AI, sortiert nach Vertical.
Du erfindest KEINE echten Zahlen, sondern arbeitest mit Platzhaltern wie [X], [ZEITRAUM], [ALT-WERT], [NEU-WERT].

VERTICAL_KEYS: network, real_estate, finance, generic

AUSGABE-STRUKTUR:
- Titel: "Wie [ORGANISATION] in [ZEITRAUM] [ERGEBNIS]"
- Ausgangssituation (3 Bulletpoints)
- Herausforderung (3 Bulletpoints)
- Lösung mit Sales Flow AI (3 Bulletpoints)
- Ergebnisse nach [ZEITRAUM] (3 Bulletpoints mit [PLATZHALTER])
- Optional: Zitat von [NAME], [ROLLE]

WICHTIG: Alle Zahlen sind Platzhalter. Keine Halluzination von Daten.

---

USAGE:
- Wenn OUTPUT_FORMAT "vertical section" oder "story section" enthält:
  → Bei vertical=network → nutze [BLOCK: DEFAULT_VERTICAL_SECTION_NETWORK]
  → Bei vertical=real_estate → nutze [BLOCK: DEFAULT_VERTICAL_SECTION_REAL_ESTATE]
  → Bei vertical=finance → nutze [BLOCK: DEFAULT_VERTICAL_SECTION_FINANCE]
  → Bei vertical=generic → nutze [BLOCK: DEFAULT_VERTICAL_SECTION_GENERIC]

- Wenn OUTPUT_FORMAT "social" oder "hook" enthält:
  → Nutze passende [HOOKS: VERTICAL] als Basis

- Wenn OUTPUT_FORMAT "case study" enthält:
  → Nutze [MODULE: CASE_STUDY_TEMPLATES] für strukturierte Case Study mit Platzhaltern
"""
    
    # User Prompt – strukturiert gemäß GTM_COPY-Definition
    user_parts = []
    
    user_parts.append("[TASK]")
    user_parts.append(payload.task.strip())
    
    user_parts.append("\n[CONTEXT]")
    user_parts.append(payload.context.strip() if payload.context else "keine zusätzlichen Hinweise")
    
    user_parts.append("\n[PRODUCT]")
    user_parts.append("Sales Flow AI")
    
    user_parts.append("\n[PACKAGE]")
    user_parts.append(payload.package or "")
    
    user_parts.append("\n[CHANNEL]")
    user_parts.append(payload.channel or "Landingpage")
    
    user_parts.append("\n[STYLE]")
    user_parts.append(payload.style or "balanced")
    
    user_parts.append("\n[OUTPUT_FORMAT]")
    user_parts.append(payload.output_format or "")
    
    user_parts.append("\n[VERTICAL]")
    user_parts.append(payload.vertical or "generic")
    
    if payload.persona_key:
        user_parts.append("\n[PERSONA_KEY]")
        user_parts.append(payload.persona_key)
    
    user_prompt = "\n".join(user_parts)
    
    try:
        client = get_openai_client()
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        
        ai_response = response.choices[0].message.content
        
        if not ai_response or not isinstance(ai_response, str):
            raise HTTPException(
                status_code=500,
                detail="KI-Antwort konnte nicht verarbeitet werden."
            )
        
        return GtmCopyResponse(content=ai_response.strip())
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"KI-Generierung ist fehlgeschlagen: {str(e)}",
        )

# ─────────────────────────────────────────────────────────────────
# Demo-Fallback (wenn kein OpenAI API Key)
# ─────────────────────────────────────────────────────────────────

def get_demo_gtm_copy(task: str, channel: Optional[str], vertical: Optional[str]) -> str:
    """Gibt Demo-Content zurück, wenn kein OpenAI API Key konfiguriert ist"""
    
    vertical_label = {
        "network": "Network Marketing",
        "real_estate": "Immobilien",
        "finance": "Finance",
        "generic": "Allgemein"
    }.get(vertical or "generic", "Allgemein")
    
    channel_label = {
        "landingpage": "Landingpage",
        "offer": "Angebot",
        "sales_script": "Sales-Script",
        "social_post": "Social Post"
    }.get(channel or "landingpage", "Landingpage")
    
    return f"""# DEMO-MODUS: GTM Copy Assistant

**Task:** {task}

**Vertical:** {vertical_label}
**Channel:** {channel_label}

---

## Hero Section

**Mehr Abschlüsse mit denselben Leads – ohne mehr Chaos, ohne mehr Tools.**

Sales Flow AI ist der KI-Vertriebs-Copilot für dein {vertical_label}-Team. 
Kein weiteres CRM. Sondern der digitale Head of Sales, der Follow-ups priorisiert, 
Einwände coacht und dein Team auf Kurs hält.

→ [Demo anfragen – 15 Minuten reichen]

---

## Problem / Lösung

**Das Problem:**

- Follow-ups gehen unter → Abschlüsse bleiben liegen
- Einwände kosten Zeit → dein Team improvisiert, statt zu performen
- Priorisierung ist Bauchgefühl → die heißen Kontakte werden kalt

**Die Lösung:**

✅ Follow-up Engine – Jeder Kontakt landet zur richtigen Zeit wieder auf dem Radar
✅ Objection Brain – KI liefert 2–3 starke Antworten auf jeden Einwand
✅ Next-Best-Actions – KI priorisiert, was jetzt wirklich zählt
✅ Team Dashboard – Du siehst, wer Follow-ups erledigt und wer sie skippt

---

## Pakete

**Sales Flow Team** (5-25 Nutzer)
ab 990 €/Monat + Setup

Perfekt für {vertical_label}-Teams mit strukturiertem Vertrieb.

---

**💡 Hinweis:** Dies ist Demo-Content. 
Für echte KI-generierte Texte bitte OPENAI_API_KEY konfigurieren.
"""

