"""
================================================================================
SALES FLOW AI - KNOWLEDGE BASE SEED DATA
================================================================================

Enthält:
    - Produkt-USPs (5 Killer-Features)
    - Zielgruppen-Pitches
    - Einwand-Behandlungen
    - Pricing-Infos
    - Compliance-Texte

================================================================================
"""

from typing import Dict, Any, List

# =============================================================================
# QUICK FACTS - Kernprodukt
# =============================================================================

SALESFLOW_QUICK_FACTS: List[Dict[str, Any]] = [
    # Locked Block™
    {
        "company_id": None,  # System-weit
        "vertical": "all",
        "fact_type": "usp",
        "fact_key": "locked_block",
        "fact_value": "Locked Block™ Technology schützt den Bot vor Prompt-Injection und Manipulation. Der Bot plaudert niemals Interna aus, egal wie clever die Fragen formuliert sind.",
        "fact_short": "Locked Block™ – Dein Bot ist manipulationssicher. Keine Interna-Leaks.",
        "source": "product",
        "use_in_contexts": ["security", "objection_trust", "enterprise"],
        "importance": 95,
        "is_key_fact": True,
        "language": "de"
    },
    # Knowledge Base Zwang
    {
        "company_id": None,
        "vertical": "all",
        "fact_type": "usp",
        "fact_key": "knowledge_base_constraint",
        "fact_value": "Der Bot nutzt ausschließlich firmeneigene PDFs, Preislisten und verifizierte Informationen. Er rät niemals und erfindet keine Fakten. Wenn er etwas nicht weiß, sagt er es ehrlich.",
        "fact_short": "Knowledge Base Zwang – Der Bot nutzt NUR deine verifizierten Daten. Null Halluzinationen.",
        "source": "product",
        "use_in_contexts": ["accuracy", "objection_trust", "compliance"],
        "importance": 95,
        "is_key_fact": True,
        "language": "de"
    },
    # Liability Shield
    {
        "company_id": None,
        "vertical": "all",
        "fact_type": "usp",
        "fact_key": "liability_shield",
        "fact_value": "Ein intelligenter Filter erkennt und umschreibt rechtlich gefährliche Aussagen automatisch. Heilversprechen, Garantien und unzulässige Behauptungen werden in compliance-konforme Formulierungen umgewandelt.",
        "fact_short": "Liability Shield – Automatischer Compliance-Filter. Keine Abmahnungsgefahr.",
        "source": "product",
        "use_in_contexts": ["compliance", "health", "finance", "legal"],
        "importance": 90,
        "is_key_fact": True,
        "language": "de"
    },
    # Neuro-Profiler
    {
        "company_id": None,
        "vertical": "all",
        "fact_type": "usp",
        "fact_key": "neuro_profiler",
        "fact_value": "Der Neuro-Profiler analysiert den Kunden-Typ basierend auf DISC (Dominant, Initiativ, Stetig, Gewissenhaft) und passt Tonalität, Argumentationsstil und Gesprächsführung automatisch an.",
        "fact_short": "Neuro-Profiler – Erkennt den Kunden-Typ (DISC) und passt die Ansprache an.",
        "source": "product",
        "use_in_contexts": ["personalization", "sales", "communication"],
        "importance": 85,
        "is_key_fact": True,
        "language": "de"
    },
    # Silent Guard
    {
        "company_id": None,
        "vertical": "all",
        "fact_type": "usp",
        "fact_key": "silent_guard",
        "fact_value": "Silent Guard ist ein integrierter Kopierschutz, der verhindert, dass dein maßgeschneidertes System einfach kopiert oder weitergegeben wird. Dein Wettbewerbsvorteil bleibt exklusiv.",
        "fact_short": "Silent Guard – Kopierschutz für dein exklusives Verkaufssystem.",
        "source": "product",
        "use_in_contexts": ["security", "enterprise", "exclusive"],
        "importance": 75,
        "is_key_fact": False,
        "language": "de"
    },
    
    # Problem-Statements
    {
        "company_id": None,
        "vertical": "all",
        "fact_type": "problem",
        "fact_key": "unprotected_ai",
        "fact_value": "Viele Mitarbeiter nutzen ChatGPT privat und unsicher. Das führt zu Datenlecks, falschen Preisangaben und Halluzinationen, die Kunden verunsichern.",
        "fact_short": "Problem: Ungeschützte KI = Datenlecks, falsche Preise, Halluzinationen.",
        "source": "market_research",
        "use_in_contexts": ["problem", "pain_point"],
        "importance": 90,
        "is_key_fact": True,
        "language": "de"
    },
    {
        "company_id": None,
        "vertical": "all",
        "fact_type": "problem",
        "fact_key": "time_waste",
        "fact_value": "Vertriebler verbringen Stunden mit dem Tippen von E-Mails, Angeboten und Follow-ups, anstatt zu verkaufen. Das kostet bares Geld.",
        "fact_short": "Problem: Vertriebler tippen statt zu verkaufen.",
        "source": "market_research",
        "use_in_contexts": ["problem", "pain_point", "roi"],
        "importance": 85,
        "is_key_fact": True,
        "language": "de"
    },
    {
        "company_id": None,
        "vertical": "all",
        "fact_type": "problem",
        "fact_key": "objection_fear",
        "fact_value": "Neue Mitarbeiter haben Angst vor Einwänden. Sie wissen nicht, was sie sagen sollen, wenn der Kunde 'zu teuer' sagt – und verlieren den Deal.",
        "fact_short": "Problem: Neue Mitarbeiter haben Angst vor Einwänden.",
        "source": "market_research",
        "use_in_contexts": ["problem", "pain_point", "training"],
        "importance": 80,
        "is_key_fact": False,
        "language": "de"
    },
    
    # Pricing
    {
        "company_id": None,
        "vertical": "all",
        "fact_type": "pricing",
        "fact_key": "solo_package",
        "fact_value": "Sales Flow Solo: 149-199€/Monat für 1-3 Nutzer. Enthält Live Assist, Einwand-Brain, eine Knowledge Base und E-Mail Support.",
        "fact_short": "Solo: ab 149€/Monat für 1-3 User. Live Assist + Einwand-Brain.",
        "source": "pricing",
        "use_in_contexts": ["pricing", "small_team"],
        "importance": 70,
        "is_key_fact": False,
        "language": "de"
    },
    {
        "company_id": None,
        "vertical": "all",
        "fact_type": "pricing",
        "fact_key": "team_package",
        "fact_value": "Sales Flow Team: 990-1.490€/Monat + 3.000-5.000€ Setup für 5-25 Nutzer. Enthält alles aus Solo plus Team Dashboard, Analytics, Playbooks und Priority Support.",
        "fact_short": "Team: ab 990€/Monat für 5-25 User. + Dashboard & Analytics.",
        "source": "pricing",
        "use_in_contexts": ["pricing", "medium_team"],
        "importance": 70,
        "is_key_fact": False,
        "language": "de"
    },
    {
        "company_id": None,
        "vertical": "all",
        "fact_type": "pricing",
        "fact_key": "enterprise_package",
        "fact_value": "Sales Flow Enterprise: ab 2.400€/Monat + ab 9.800€ Setup für 50+ Nutzer. Custom-Lösung, SLA, White-Label Option, Dedicated Success Manager.",
        "fact_short": "Enterprise: ab 2.400€/Monat für 50+ User. Custom + SLA.",
        "source": "pricing",
        "use_in_contexts": ["pricing", "enterprise"],
        "importance": 70,
        "is_key_fact": False,
        "language": "de"
    },
]


# =============================================================================
# ZIELGRUPPEN-PITCHES
# =============================================================================

VERTICAL_PITCHES: List[Dict[str, Any]] = [
    # Network Marketing
    {
        "company_id": None,
        "vertical": "network_marketing",
        "knowledge_type": "pitch",
        "topic": "main_pitch",
        "question": "Was bringt Sales Flow AI für Network Marketing?",
        "answer_short": "Duplizierung auf Knopfdruck. Dein neuer Partner antwortet ab Tag 1 so sicher wie ein Diamond-Leader. Keine Angst mehr vor 'Zu teuer'. Keine falschen Heilversprechen mehr.",
        "answer_full": """Sales Flow AI ist der Game-Changer für Network Marketing Teams:

🎯 **Duplizierung auf Knopfdruck**
Dein neuer Partner hat sofort das Wissen eines Diamond-Leaders. Er antwortet auf Einwände, als würde er seit Jahren im Business sein.

💪 **Keine Angst vor Einwänden**
"Zu teuer", "Hab keine Zeit", "Klingt nach MLM" – dein Team hat sofort die perfekte Antwort parat.

⚖️ **Compliance eingebaut**
Der Liability Shield filtert automatisch Heilversprechen. Keine Abmahnungen, keine Ärger mit der Firma.

📈 **Messbare Ergebnisse**
Dashboard zeigt dir, welche Einwände am häufigsten kommen und wie dein Team performed.""",
        "keywords": ["network", "mlm", "duplizierung", "partner", "team"],
        "is_active": True,
        "language": "de"
    },
    # Real Estate
    {
        "company_id": None,
        "vertical": "real_estate",
        "knowledge_type": "pitch",
        "topic": "main_pitch",
        "question": "Was bringt Sales Flow AI für Immobilienmakler?",
        "answer_short": "Schreibst du noch Exposés oder verkaufst du schon? Mein System erstellt emotionale Texte in 3 Sekunden und filtert Touristen von echten Käufern.",
        "answer_full": """Sales Flow AI für Immobilienmakler:

✍️ **Exposés in Sekunden**
Emotionale, verkaufsstarke Objektbeschreibungen – automatisch generiert aus deinen Eckdaten.

🎯 **Käufer-Qualifizierung**
Der Bot erkennt echte Interessenten vs. "Sonntagsfahrer" und priorisiert deine Zeit.

📧 **Follow-up Automation**
Automatische Nachfass-Sequenzen halten Interessenten warm, bis sie bereit sind.

📊 **Marktdaten integriert**
Der Bot kennt Preise, Lagen und Argumente – und nutzt sie im Gespräch.""",
        "keywords": ["immobilien", "makler", "exposé", "käufer", "wohnung", "haus"],
        "is_active": True,
        "language": "de"
    },
    # Hospitality
    {
        "company_id": None,
        "vertical": "hospitality",
        "knowledge_type": "pitch",
        "topic": "main_pitch",
        "question": "Was bringt Sales Flow AI für Gastro und Hotels?",
        "answer_short": "Der digitale Empfangschef. Beantwortet Beschwerden diplomatisch und verkauft Upgrades, während dein Team schläft.",
        "answer_full": """Sales Flow AI für Gastro & Hotels:

🌙 **24/7 Gästeservice**
Anfragen, Reservierungen, Beschwerden – alles automatisch beantwortet, auch nachts.

💎 **Upselling ohne Druck**
Der Bot empfiehlt Zimmer-Upgrades, Spa-Pakete oder Dinner-Specials – charmant und effektiv.

😊 **Beschwerde-Management**
Diplomatische Antworten, die Gäste beruhigen und in Stammkunden verwandeln.

⭐ **Review-Management**
Automatische Antworten auf Google/TripAdvisor Reviews, immer professionell.""",
        "keywords": ["hotel", "restaurant", "gastro", "gast", "reservierung", "beschwerden"],
        "is_active": True,
        "language": "de"
    },
    # B2B
    {
        "company_id": None,
        "vertical": "b2b",
        "knowledge_type": "pitch",
        "topic": "main_pitch",
        "question": "Was bringt Sales Flow AI für B2B und Industrie?",
        "answer_short": "Der ROI-Rechner. Zeige dem Kunden mathematisch, warum dein teureres Produkt ihn billiger kommt als die Konkurrenz.",
        "answer_full": """Sales Flow AI für B2B & Industrie:

📊 **ROI-Argumentation**
Der Bot rechnet vor, warum dein Produkt trotz höherem Preis die bessere Investition ist.

⚡ **Technische Anfragen**
Sofortige Antworten auf komplexe technische Fragen – aus deiner Wissensdatenbank.

📝 **Angebots-Unterstützung**
Schnellere Angebotserstellung mit vorqualifizierten Anforderungen.

🏆 **Wettbewerbsvergleiche**
Faktenbasierte Vergleiche, die deine Stärken hervorheben.""",
        "keywords": ["b2b", "industrie", "roi", "investition", "technisch", "angebot"],
        "is_active": True,
        "language": "de"
    },
]


# =============================================================================
# EINWAND-BEHANDLUNGEN FÜR SALES FLOW SELBST
# =============================================================================

SALESFLOW_OBJECTION_RESPONSES: List[Dict[str, Any]] = [
    # Preis-Einwände
    {
        "company_id": None,
        "vertical": "all",
        "objection_type": "price",
        "objection_keywords": ["teuer", "preis", "kosten", "budget"],
        "objection_example": "Das ist uns zu teuer.",
        "response_short": "Verstehe ich. Die Frage ist: Was kostet dich NICHT zu haben? Ein Mitarbeiter, der 2 Stunden am Tag E-Mails tippt statt zu verkaufen, kostet dich mehr als 149€ im Monat. Rechne mal mit.",
        "response_full": """Das höre ich oft. Lass uns kurz rechnen:

**Ohne Sales Flow AI:**
- Mitarbeiter tippt 2h/Tag E-Mails → 40h/Monat
- Bei 50€/h Arbeitskosten = 2.000€/Monat
- Plus: Verlorene Deals durch schlechte Einwandbehandlung

**Mit Sales Flow AI:**
- E-Mails in Sekunden statt Minuten
- Perfekte Einwandbehandlung = höhere Abschlussquote
- Invest: 149-990€/Monat

**ROI:** Meist schon nach dem ersten zusätzlichen Abschluss erreicht.

Was wäre für dich 1 zusätzlicher Abschluss pro Monat wert?""",
        "response_technique": "roi_calculation",
        "follow_up_question": "Was wäre für dich ein zusätzlicher Abschluss pro Monat wert?",
        "effectiveness_score": 0.85,
        "is_active": True,
        "language": "de"
    },
    # Trust-Einwände
    {
        "company_id": None,
        "vertical": "all",
        "objection_type": "trust",
        "objection_keywords": ["funktioniert", "wirklich", "skeptisch", "klappt"],
        "objection_example": "Funktioniert das wirklich?",
        "response_short": "Berechtigte Frage. Deshalb biete ich dir eine 30-Minuten-Demo an, in der ich das System mit DEINEN Daten zeige. Du siehst live, wie es für dein Business funktioniert. Kein Risiko.",
        "response_full": """Völlig verständlich, dass du skeptisch bist. Ich würde es auch sein.

Deshalb mein Vorschlag:
1. **30-Minuten Demo** mit DEINEN echten Beispielen
2. **Kein Pitch** – du siehst das System in Aktion
3. **Danach entscheidest du** – kein Druck, kein Verkaufsgespräch

Was ich oft höre nach der Demo: "Ah, DAS meint ihr damit!"

Viele denken, es ist "nur ein Chatbot". Aber wenn sie sehen, wie er Einwände behandelt, Kunden-Typen erkennt und dabei compliant bleibt – dann klickt's.

Wann hast du 30 Minuten?""",
        "response_technique": "demo_offer",
        "follow_up_question": "Wann hast du 30 Minuten für eine unverbindliche Demo?",
        "effectiveness_score": 0.80,
        "is_active": True,
        "language": "de"
    },
    # "Haben wir schon"
    {
        "company_id": None,
        "vertical": "all",
        "objection_type": "competitor",
        "objection_keywords": ["chatgpt", "haben schon", "nutzen bereits", "eigene lösung"],
        "objection_example": "Wir nutzen schon ChatGPT.",
        "response_short": "Genau das ist oft das Problem. ChatGPT allein hat keine Leitplanken. Sales Flow AI ist der 'Smart Layer' dazwischen – er sorgt dafür, dass dein Team nur das sagen kann, was es sagen DARF.",
        "response_full": """Viele nutzen ChatGPT. Die Frage ist: WIE?

**ChatGPT allein:**
❌ Plaudert alles aus, wenn man geschickt fragt
❌ Erfindet Preise und Fakten ("Halluzinationen")
❌ Keine Kontrolle über Compliance
❌ Jeder macht sein eigenes Ding

**Sales Flow AI:**
✅ Locked Block™ verhindert Manipulation
✅ Nutzt NUR deine verifizierten Daten
✅ Liability Shield für Compliance
✅ Einheitliche Qualität im ganzen Team

Der Unterschied: ChatGPT ist das Werkzeug. Sales Flow AI ist das Sicherheitsnetz drumherum.

Darf ich dir den Unterschied in einer kurzen Demo zeigen?""",
        "response_technique": "differentiation",
        "follow_up_question": "Darf ich dir den Unterschied in einer kurzen Demo zeigen?",
        "effectiveness_score": 0.75,
        "is_active": True,
        "language": "de"
    },
    # Zeit-Einwand
    {
        "company_id": None,
        "vertical": "all",
        "objection_type": "time",
        "objection_keywords": ["zeit", "später", "gerade nicht", "busy"],
        "objection_example": "Ich habe gerade keine Zeit dafür.",
        "response_short": "Genau deshalb zeige ich dir das System. Es spart dir Zeit. 30 Minuten Demo jetzt → Stunden pro Woche gespart danach. Wann passt dir ein kurzer Termin?",
        "response_full": """Das verstehe ich total. Gerade weil du keine Zeit hast, ist das hier relevant.

Die durchschnittlichen Ergebnisse nach Implementierung:
- **2-3 Stunden/Tag** weniger E-Mail-Tippen
- **50% schnellere** Angebotsstellung
- **Sofortige** Einwandbehandlung ohne Grübeln

Die 30-Minuten-Demo kostet dich einmalig Zeit.
Das System spart dir danach jede Woche Stunden.

Was wäre, wenn du morgen 2 Stunden mehr für echte Verkaufsgespräche hättest?

Wann passt dir ein kurzer Slot – diese Woche noch?""",
        "response_technique": "time_investment",
        "follow_up_question": "Wann passt dir ein kurzer 30-Minuten-Slot diese Woche?",
        "effectiveness_score": 0.70,
        "is_active": True,
        "language": "de"
    },
]


# =============================================================================
# DISC NEURO-PROFILER KNOWLEDGE
# =============================================================================

DISC_PROFILES: List[Dict[str, Any]] = [
    {
        "company_id": None,
        "vertical": "all",
        "knowledge_type": "disc_profile",
        "topic": "dominant",
        "question": "Wie erkenne ich einen D-Typ (Dominant) und wie spreche ich ihn an?",
        "answer_short": "D-Typen sind direkt, ungeduldig, ergebnisorientiert. Komm auf den Punkt. Zeig ROI. Keine Smalltalk-Einleitung.",
        "answer_full": """**D-Typ (Dominant) – Der Macher**

**Erkennungsmerkmale:**
- Redet schnell, unterbricht
- Fragt nach Ergebnissen, nicht Prozessen
- "Was bringt mir das?" ist die Kernfrage
- Ungeduldig bei Details
- Will Kontrolle behalten

**Kommunikationsstil:**
✅ Kurz und direkt
✅ Ergebnisse und ROI zuerst
✅ Optionen anbieten, entscheiden lassen
✅ Selbstbewusst auftreten

❌ NICHT: Lange Einleitungen, zu viele Details, emotional argumentieren

**Beispiel-Einstieg:**
"3 Zahlen, die für dich relevant sind: [Zahl 1], [Zahl 2], [Zahl 3]. Was davon interessiert dich am meisten?"
""",
        "keywords": ["dominant", "d-typ", "macher", "direkt", "ungeduldig"],
        "is_active": True,
        "language": "de"
    },
    {
        "company_id": None,
        "vertical": "all",
        "knowledge_type": "disc_profile",
        "topic": "initiative",
        "question": "Wie erkenne ich einen I-Typ (Initiativ) und wie spreche ich ihn an?",
        "answer_short": "I-Typen sind enthusiastisch, gesprächig, beziehungsorientiert. Sei begeistert mit. Erzähl Stories. Mach's persönlich.",
        "answer_full": """**I-Typ (Initiativ) – Der Entertainer**

**Erkennungsmerkmale:**
- Redet viel, erzählt Geschichten
- Lacht, macht Witze
- Kennt "jemanden, der jemanden kennt"
- Springt zwischen Themen
- Will gemocht werden

**Kommunikationsstil:**
✅ Enthusiastisch und persönlich
✅ Stories und Beispiele
✅ Beziehung vor Business
✅ Vision und Big Picture

❌ NICHT: Zu viele Zahlen, trockene Fakten, unpersönlich

**Beispiel-Einstieg:**
"Ich hab letzte Woche mit einem Kunden gesprochen, der hatte genau dein Problem – und weißt du, was passiert ist? [Story]"
""",
        "keywords": ["initiativ", "i-typ", "entertainer", "enthusiastisch", "gesprächig"],
        "is_active": True,
        "language": "de"
    },
    {
        "company_id": None,
        "vertical": "all",
        "knowledge_type": "disc_profile",
        "topic": "steady",
        "question": "Wie erkenne ich einen S-Typ (Stetig) und wie spreche ich ihn an?",
        "answer_short": "S-Typen sind ruhig, geduldig, harmoniebedürftig. Gib ihnen Zeit. Kein Druck. Zeig Sicherheit und Stabilität.",
        "answer_full": """**S-Typ (Stetig) – Der Teamplayer**

**Erkennungsmerkmale:**
- Ruhig, freundlich, zurückhaltend
- Hört mehr als er redet
- Fragt nach dem "Wie" nicht dem "Was"
- Braucht Zeit für Entscheidungen
- Vermeidet Konflikte

**Kommunikationsstil:**
✅ Ruhig und geduldig
✅ Sicherheit und Stabilität betonen
✅ Schritt-für-Schritt erklären
✅ Zeit geben, nicht drängen

❌ NICHT: Schnelle Entscheidungen fordern, aggressiv verkaufen, Druck machen

**Beispiel-Einstieg:**
"Ich zeig dir erstmal in Ruhe, wie das funktioniert. Danach hast du alle Zeit der Welt, das zu überdenken. Kein Druck."
""",
        "keywords": ["stetig", "s-typ", "teamplayer", "ruhig", "geduldig"],
        "is_active": True,
        "language": "de"
    },
    {
        "company_id": None,
        "vertical": "all",
        "knowledge_type": "disc_profile",
        "topic": "conscientious",
        "question": "Wie erkenne ich einen C-Typ (Gewissenhaft) und wie spreche ich ihn an?",
        "answer_short": "C-Typen sind analytisch, detailorientiert, vorsichtig. Bring Zahlen, Daten, Fakten. Sei präzise. Lass ihn recherchieren.",
        "answer_full": """**C-Typ (Gewissenhaft) – Der Analytiker**

**Erkennungsmerkmale:**
- Stellt viele Detail-Fragen
- Will alles verstehen bevor er entscheidet
- Skeptisch gegenüber Versprechen
- Sucht nach Fehlern und Risiken
- Braucht schriftliche Unterlagen

**Kommunikationsstil:**
✅ Zahlen, Daten, Fakten
✅ Präzise und detailliert
✅ Schriftliche Dokumentation
✅ Logische Argumentation

❌ NICHT: Übertreiben, emotional verkaufen, Details überspringen

**Beispiel-Einstieg:**
"Ich schick dir nach dem Call eine detaillierte Übersicht mit allen technischen Specs. Aber kurz die wichtigsten Zahlen: [präzise Daten]"
""",
        "keywords": ["gewissenhaft", "c-typ", "analytiker", "detailorientiert", "zahlen"],
        "is_active": True,
        "language": "de"
    },
]


# =============================================================================
# EXPORT ALL
# =============================================================================

def get_all_salesflow_knowledge() -> Dict[str, List[Dict[str, Any]]]:
    """Gibt alle Knowledge-Daten zurück."""
    return {
        "quick_facts": SALESFLOW_QUICK_FACTS,
        "vertical_pitches": VERTICAL_PITCHES,
        "objection_responses": SALESFLOW_OBJECTION_RESPONSES,
        "disc_profiles": DISC_PROFILES,
    }


def seed_salesflow_knowledge(db_client) -> Dict[str, int]:
    """
    Seeded alle Knowledge-Daten in Supabase.
    
    Args:
        db_client: Supabase Client
        
    Returns:
        Dictionary mit Anzahl pro Tabelle
    """
    results = {}
    
    # Quick Facts
    try:
        db_client.table("quick_facts").upsert(
            SALESFLOW_QUICK_FACTS,
            on_conflict="fact_key"
        ).execute()
        results["quick_facts"] = len(SALESFLOW_QUICK_FACTS)
    except Exception as e:
        print(f"Error seeding quick_facts: {e}")
        results["quick_facts"] = 0
    
    # Vertical Knowledge
    try:
        db_client.table("vertical_knowledge").upsert(
            VERTICAL_PITCHES,
            on_conflict="topic,vertical"
        ).execute()
        results["vertical_pitches"] = len(VERTICAL_PITCHES)
    except Exception as e:
        print(f"Error seeding vertical_pitches: {e}")
        results["vertical_pitches"] = 0
    
    # Objection Responses
    try:
        db_client.table("objection_responses").upsert(
            SALESFLOW_OBJECTION_RESPONSES,
            on_conflict="objection_type,vertical"
        ).execute()
        results["objection_responses"] = len(SALESFLOW_OBJECTION_RESPONSES)
    except Exception as e:
        print(f"Error seeding objection_responses: {e}")
        results["objection_responses"] = 0
    
    # DISC Profiles
    try:
        db_client.table("vertical_knowledge").upsert(
            DISC_PROFILES,
            on_conflict="topic,vertical"
        ).execute()
        results["disc_profiles"] = len(DISC_PROFILES)
    except Exception as e:
        print(f"Error seeding disc_profiles: {e}")
        results["disc_profiles"] = 0
    
    return results


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    import json
    
    print("=" * 60)
    print("SALES FLOW AI - KNOWLEDGE BASE SEED DATA")
    print("=" * 60)
    
    data = get_all_salesflow_knowledge()
    
    for key, items in data.items():
        print(f"\n{key}: {len(items)} Einträge")
        for item in items[:2]:
            if "fact_short" in item:
                print(f"  • {item['fact_short'][:60]}...")
            elif "answer_short" in item:
                print(f"  • {item['answer_short'][:60]}...")
            elif "response_short" in item:
                print(f"  • {item['response_short'][:60]}...")
    
    print("\n" + "=" * 60)
    print("Zum Seeden: python -c \"from app.seeds.salesflow_knowledge_seed import seed_salesflow_knowledge; ...\"")

