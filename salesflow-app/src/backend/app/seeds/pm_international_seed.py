"""
PM-International (FitLine) Seed Data
Vollständiges Company-Profil für das Brand Storybook System
"""

from typing import Dict, Any, List


# =============================================================================
# COMPANY CONFIG
# =============================================================================

PM_COMPANY: Dict[str, Any] = {
    "name": "PM-International",
    "slug": "pm-international",
    "vertical": "network_marketing",
    "description": "Deutsches Unternehmen für hochwertige Nahrungsergänzung und Sport-Nutrition mit dem Nutrient Transport Concept (NTC)",
    "website": "https://www.pm-international.com",
    "compliance_level": "strict",
    "brand_config": {
        "primary_color": "#1B4F72",
        "secondary_color": "#F39C12",
        "country": "DE",
        "founded_year": 1993,
        "headquarters": "Speyer, Deutschland",
        "business_model": "network_marketing",
        "product_focus": ["sport_nutrition", "wellness", "beauty", "weight_management"],
        "key_differentiator": "nutrient_transport_concept",
        "tagline": "More Quality for your Life",
    }
}


# =============================================================================
# STORIES
# =============================================================================

PM_STORIES: List[Dict[str, Any]] = [
    # Elevator Pitch
    {
        "story_type": "elevator_pitch",
        "audience": "consumer",
        "title": "FitLine in 30 Sekunden",
        "content_30s": """FitLine ist die Premium-Linie von PM-International – einem deutschen Unternehmen, das seit über 30 Jahren Nahrungsergänzung macht.

Das Besondere: Das NTC – Nutrient Transport Concept. Das sorgt dafür, dass die Nährstoffe nicht im Magen zerstört werden, sondern genau dort ankommen, wo sie gebraucht werden – in deinen Zellen.

Ob Sportler, gestresste Berufstätige oder Menschen die mehr Energie wollen – FitLine hat Produkte für jeden Bedarf. Und das Beste: Made in Germany, höchste Qualität, von Spitzensportlern weltweit genutzt.

Echte Qualität. Echte Ergebnisse.""",
        "use_case": "Erstkontakt, wenn jemand fragt 'Was ist FitLine?'",
        "channel_hints": ["instagram", "whatsapp", "linkedin"],
        "tags": ["intro", "overview", "ntc", "made_in_germany"],
    },
    
    # 2-Minuten Story für Kunden
    {
        "story_type": "short_story",
        "audience": "consumer",
        "title": "Die FitLine-Geschichte (2 Min)",
        "content_2min": """Kennst du das? Du nimmst Vitamine, aber du merkst keinen Unterschied.

Das liegt oft daran, dass die meisten Supplements im Magen zerstört werden, bevor sie wirken können. Genau dieses Problem hat PM-International vor über 30 Jahren in Deutschland gelöst.

Sie haben das NTC entwickelt – das Nutrient Transport Concept. Es schützt die Nährstoffe auf dem Weg durch den Körper und bringt sie genau dorthin, wo sie gebraucht werden: in deine Zellen.

Das Ergebnis merkst du schnell. Die meisten spüren schon nach 2-3 Wochen mehr Energie, besseren Schlaf, mehr Fokus.

Und FitLine ist nicht irgendein Supplement aus dem Internet. Es ist Made in Germany, wird von über 1.000 Spitzensportlern weltweit genutzt – von Olympiasiegern, Fußballprofis, Extremsportlern. Nicht weil sie gesponsert werden, sondern weil es funktioniert.

Das ist FitLine: Deutsche Qualität, wissenschaftliche Innovation, echte Ergebnisse.""",
        "use_case": "Ausführlichere Erklärung bei echtem Interesse",
        "channel_hints": ["call", "video", "presentation"],
        "tags": ["story", "why_fitline", "ntc", "athletes"],
    },
    
    # Business-Partner Story
    {
        "story_type": "why_story",
        "audience": "business_partner",
        "title": "Warum FitLine als Business?",
        "content_2min": """Du überlegst, ob Network Marketing etwas für dich ist? Hier ist, warum PM-International anders ist.

Erstens: Die Produkte funktionieren. Nicht "ich glaube, es hilft" – sondern echte, spürbare Ergebnisse. Das macht den Verkauf einfach, weil zufriedene Kunden bleiben und weiterempfehlen.

Zweitens: Deutsche Qualität und Geschichte. PM gibt es seit über 30 Jahren – kein Hype-Startup, das morgen weg ist. Ein solides, wachsendes Unternehmen mit Hauptsitz in Deutschland.

Drittens: Die Sportler-Community. Wenn Olympiasieger und Weltmeister dein Produkt nutzen, hast du die beste Empfehlung der Welt.

Viertens: Internationales Potenzial. PM ist in über 40 Ländern aktiv. Du kannst weltweit ein Team aufbauen.

Und das Wichtigste: Du kannst mit Überzeugung dahinterstehen. Weil du die Produkte selbst nutzt und den Unterschied spürst.""",
        "use_case": "Wenn jemand über Business-Möglichkeit nachdenkt",
        "channel_hints": ["call", "zoom", "coffee"],
        "tags": ["business", "opportunity", "made_in_germany"],
    },
    
    # Einwand: "Ist das nicht MLM?"
    {
        "story_type": "objection_story",
        "audience": "skeptic",
        "title": "Einwand: 'Ist das MLM?'",
        "content_1min": """Ja, PM-International nutzt Network Marketing als Vertriebsmodell. Und ich verstehe, dass du vielleicht skeptisch bist.

Lass mich dir zwei Dinge sagen:

Erstens: PM wurde 2011 vom Oberlandesgericht Frankfurt rechtlich geprüft und als seriöses, legales Unternehmen bestätigt. Es ist kein Schneeballsystem – du verdienst an Produktverkäufen, nicht am Anwerben.

Zweitens: Der Fokus liegt auf echten Produkten, die echte Ergebnisse liefern. Deshalb haben wir eine so hohe Kundenbindung. Leute bleiben nicht wegen dem Business – sie bleiben, weil FitLine funktioniert.

Ich erzähl dir gerne mehr über meine eigene Erfahrung. Aber letztlich musst du selbst entscheiden, ob es zu dir passt.""",
        "use_case": "Wenn jemand skeptisch wegen MLM ist",
        "channel_hints": ["chat", "call", "dm"],
        "tags": ["objection", "mlm", "legal", "skeptic"],
    },
    
    # Einwand: "Zu teuer"
    {
        "story_type": "objection_story",
        "audience": "consumer",
        "title": "Einwand: 'Das ist mir zu teuer'",
        "content_1min": """Verstehe ich. Lass uns mal rechnen.

Ein Basics-Paket kostet etwa 1,50€ am Tag. Das ist weniger als ein Kaffee bei Starbucks.

Der Unterschied: Der Kaffee gibt dir 2 Stunden Energie und dann ein Tief. FitLine gibt dir den ganzen Tag stabile Energie – ohne Crash.

Und denk mal an die alternative: Du kaufst günstige Vitamine im Drogeriemarkt. Die werden im Magen zerstört und landen größtenteils... naja, im Klo. Geld rausgeschmissen.

Bei FitLine zahlst du für Qualität, die ankommt. Deutsche Produktion, NTC-Technologie, wissenschaftlich entwickelt.

Aber hey – probier es einfach 2 Wochen. Wenn du keinen Unterschied merkst, ist es nichts für dich. Die meisten merken aber schon nach ein paar Tagen, dass sich was tut.""",
        "use_case": "Wenn jemand den Preis als Einwand nennt",
        "channel_hints": ["chat", "call"],
        "tags": ["objection", "price", "value", "comparison"],
    },
    
    # Sportler-Story
    {
        "story_type": "proof_story",
        "audience": "consumer",
        "title": "Warum Spitzensportler FitLine nutzen",
        "content_1min": """Über 1.000 Spitzensportler weltweit nutzen FitLine. Olympiasieger, Weltmeister, Profis aus Fußball, Triathlon, Ski, Kampfsport.

Warum ist das wichtig?

Diese Athleten können es sich nicht leisten, auf Produkte zu setzen, die nicht funktionieren. Ihr Körper ist ihr Kapital. Sie testen ständig, optimieren ständig.

Und sie bleiben bei FitLine – nicht weil sie gesponsert werden, sondern weil sie echte Ergebnisse sehen. Bessere Regeneration, stabilere Energie, weniger Verletzungen.

Das ist kein Marketing-Claim. Das sind echte Athleten, die auf FitLine setzen, obwohl sie jedes andere Produkt der Welt kostenlos bekommen könnten.

Wenn es für einen Olympiasieger gut genug ist, ist es wahrscheinlich auch gut genug für dich.""",
        "use_case": "Als Social Proof",
        "channel_hints": ["presentation", "social", "chat"],
        "tags": ["athletes", "proof", "credibility", "performance"],
    },
]


# =============================================================================
# PRODUCTS
# =============================================================================

PM_PRODUCTS: List[Dict[str, Any]] = [
    {
        "name": "FitLine Basics",
        "slug": "fitline_basics",
        "category": "basics",
        "tagline": "Die Grundversorgung für jeden Tag",
        "description_short": "Ballaststoffe und essentielle Nährstoffe für deine Basis – das Fundament für optimale Aufnahme.",
        "description_full": """FitLine Basics ist das Fundament des FitLine-Systems.

Es enthält:
• Ballaststoffe für einen gesunden Darm
• Präbiotika für die Darmflora
• Das NTC für optimale Nährstoff-Aufnahme

Warum ist das wichtig? Dein Darm entscheidet, was aufgenommen wird. Wenn der Darm nicht optimal arbeitet, nutzen auch die besten Vitamine nichts.

Basics bereitet deinen Körper vor, damit andere Supplements besser wirken können. Deshalb immer: Erst Basics, dann der Rest.""",
        "key_benefits": [
            "Optimiert die Nährstoffaufnahme",
            "Unterstützt die Darmgesundheit",
            "Basis für alle anderen FitLine-Produkte",
            "Enthält das patentierte NTC"
        ],
        "how_to_use": "1 Portionsbeutel morgens in Wasser oder Saft einrühren, vor dem Frühstück trinken",
        "price_hint": "Ab ca. 45€/Monat im Abo",
        "subscription_available": True,
        "how_to_explain": "Basics ist wie das Fundament eines Hauses. Ohne stabiles Fundament wackelt alles andere.",
        "common_objections": ["Brauche ich wirklich Ballaststoffe?", "Kann ich das nicht über Ernährung abdecken?"],
        "sort_order": 1
    },
    {
        "name": "FitLine Activize Oxyplus",
        "slug": "fitline_activize",
        "category": "energy",
        "tagline": "Energie den ganzen Tag",
        "description_short": "B-Vitamine, Vitamin C und Guarana für natürliche Energie ohne Crash.",
        "description_full": """Activize Oxyplus ist das Energy-Produkt von FitLine.

Es enthält:
• B-Vitamine für den Energiestoffwechsel
• Vitamin C für das Immunsystem
• Guarana für natürliche Energie
• Das NTC für schnelle Verfügbarkeit

Der Unterschied zu Energy Drinks: Kein Zucker-Crash, kein Koffein-Überfluss. Stabile Energie über Stunden.

Die meisten spüren den Unterschied schon nach wenigen Tagen: Morgens wacher, nachmittags kein Tief, abends noch fit.""",
        "key_benefits": [
            "Natürliche Energie ohne Crash",
            "B-Vitamine für den Stoffwechsel",
            "Vitamin C fürs Immunsystem",
            "Wirkt innerhalb von Minuten"
        ],
        "how_to_use": "1 Messlöffel morgens in Wasser einrühren und trinken",
        "price_hint": "Ab ca. 50€/Monat im Abo",
        "subscription_available": True,
        "how_to_explain": "Activize ist wie ein Upgrade für deinen Tagesstart. Statt Coffee-Crash: Stabile Energie bis abends.",
        "common_objections": ["Ich trinke lieber Kaffee", "Ist das wie Red Bull?", "Macht das abhängig?"],
        "sort_order": 2
    },
    {
        "name": "FitLine Restorate",
        "slug": "fitline_restorate",
        "category": "regeneration",
        "tagline": "Regeneration während du schläfst",
        "description_short": "Mineralien und Spurenelemente für optimale Regeneration über Nacht.",
        "description_full": """Restorate ist das Regenerations-Produkt von FitLine.

Es enthält:
• Magnesium, Kalzium, Zink
• Spurenelemente in optimaler Bioverfügbarkeit
• Das NTC für Aufnahme auch bei leerem Magen

Warum abends? Dein Körper regeneriert sich nachts. Mit Restorate gibst du ihm die Bausteine, die er dafür braucht.

Das Ergebnis: Besser schlafen, erholter aufwachen, schneller regenerieren nach Sport oder Stress.""",
        "key_benefits": [
            "Optimale Regeneration über Nacht",
            "Alle wichtigen Mineralien und Spurenelemente",
            "Bessere Schlafqualität",
            "Schnellere Erholung nach Sport"
        ],
        "how_to_use": "1 Messlöffel abends vor dem Schlafengehen in Wasser einrühren",
        "price_hint": "Ab ca. 35€/Monat im Abo",
        "subscription_available": True,
        "how_to_explain": "Restorate ist wie ein Reset-Button für deinen Körper. Jeden Abend drücken, jeden Morgen fitter aufwachen.",
        "common_objections": ["Ich schlafe schon gut", "Brauche ich abends wirklich Mineralien?"],
        "sort_order": 3
    },
    {
        "name": "FitLine Optimal-Set",
        "slug": "fitline_optimal_set",
        "category": "bundles",
        "tagline": "Das Rundum-Paket für den perfekten Start",
        "description_short": "Basics + Activize + Restorate – die Kombination für 24-Stunden-Versorgung.",
        "description_full": """Das Optimal-Set ist die Kombination der drei Kern-Produkte:

• Basics (morgens): Bereitet deinen Körper vor
• Activize (morgens): Gibt dir Energie für den Tag
• Restorate (abends): Sorgt für Regeneration in der Nacht

Diese Dreier-Kombination deckt deinen kompletten Tag ab: Morgens aktivieren, tagsüber stabile Energie, nachts regenerieren.

Das ist das Paket, mit dem die meisten starten – und bleiben. Weil sie nach 2-3 Wochen den Unterschied spüren und nicht mehr ohne wollen.""",
        "key_benefits": [
            "Komplette 24-Stunden-Versorgung",
            "Die drei wichtigsten Produkte in einem Set",
            "Bestes Preis-Leistungs-Verhältnis",
            "Der perfekte Einstieg in FitLine"
        ],
        "price_hint": "Ab ca. 99€/Monat im Abo",
        "subscription_available": True,
        "how_to_explain": "Das Optimal-Set ist wie ein Rundum-Service für deinen Körper: Morgens tanken, nachts regenerieren.",
        "common_objections": ["Brauche ich wirklich alle drei?", "Kann ich auch einzeln anfangen?"],
        "sort_order": 4
    },
    {
        "name": "FitLine PowerCocktail",
        "slug": "fitline_powercocktail",
        "category": "energy",
        "tagline": "All-in-One für unterwegs",
        "description_short": "Vitamine, Mineralien und Antioxidantien – alles in einem Drink für Menschen mit wenig Zeit.",
        "description_full": """Der PowerCocktail ist das All-in-One-Produkt von FitLine.

Perfekt für Menschen, die:
• Wenig Zeit haben
• Nicht mehrere Produkte mixen wollen
• Unterwegs eine schnelle Lösung brauchen

Der PowerCocktail enthält die wichtigsten Vitamine, Mineralien und Antioxidantien in einer Portion. Plus das NTC für optimale Aufnahme.

Nicht so umfassend wie das Optimal-Set, aber die perfekte Lösung für den schnellen Lifestyle.""",
        "key_benefits": [
            "Alles Wichtige in einer Portion",
            "Perfekt für unterwegs",
            "Schnell zubereitet",
            "Leckerer Geschmack"
        ],
        "how_to_use": "1 Beutel in Wasser oder Saft einrühren, morgens trinken",
        "price_hint": "Ab ca. 60€/Monat im Abo",
        "subscription_available": True,
        "how_to_explain": "Der PowerCocktail ist wie ein Schweizer Taschenmesser: Alles drin, was du brauchst – in einem.",
        "common_objections": ["Ist das nicht zu wenig?", "Lieber die Einzel-Produkte?"],
        "sort_order": 5
    },
]


# =============================================================================
# GUARDRAILS
# =============================================================================

PM_GUARDRAILS: List[Dict[str, Any]] = [
    # Heilversprechen
    {
        "rule_name": "no_healing_claims",
        "rule_description": "Keine Heilversprechen oder Aussagen, dass Produkte Krankheiten diagnostizieren, behandeln oder heilen",
        "severity": "block",
        "trigger_patterns": [
            r"\bheilt\b", r"\bkuriert\b", r"\bbeseitigt\b",
            r"Krankheit.*behandeln", r"Diagnose.*stellen",
            r"garantiert.*gesund", r"100%.*Heilung",
        ],
        "replacement_suggestion": "Formuliere um: 'unterstützt', 'kann beitragen zu', 'viele Kunden berichten'",
        "example_bad": "FitLine heilt chronische Müdigkeit.",
        "example_good": "Viele Kunden berichten, dass sie mit FitLine mehr Energie haben und sich weniger müde fühlen.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "HCVO, HWG §3"
    },
    
    # Einkommensversprechen
    {
        "rule_name": "no_income_guarantees",
        "rule_description": "Keine garantierten Einkommensversprechen",
        "severity": "block",
        "trigger_patterns": [
            r"garantiert.*verdienen", r"sicher.*Einkommen",
            r"schnell.*reich", r"\d+€.*pro.*Monat.*garantiert",
            r"passives Einkommen.*ohne.*Arbeit",
        ],
        "replacement_suggestion": "Betone individuelle Faktoren: 'Einkommen hängt von Einsatz und Fähigkeiten ab'",
        "example_bad": "Mit PM verdienst du garantiert 5.000€ im Monat!",
        "example_good": "Dein Einkommen bei PM hängt von deinem Einsatz, deinen Fähigkeiten und deinem Netzwerk ab. Es gibt ein transparentes Vergütungsmodell, aber keine Garantien.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "UWG §5, MLM-Richtlinien"
    },
    
    # NTC-Erklärung
    {
        "rule_name": "ntc_accuracy",
        "rule_description": "NTC korrekt und nicht übertrieben erklären",
        "severity": "warn",
        "trigger_patterns": [
            r"NTC.*garantiert.*100%",
            r"alle.*Nährstoffe.*komplett.*aufgenommen",
            r"wissenschaftlich.*bewiesen.*dass.*NTC",
        ],
        "replacement_suggestion": "Formuliere vorsichtiger: 'Das NTC ist darauf ausgelegt, die Nährstoffaufnahme zu optimieren'",
        "example_bad": "Das NTC garantiert, dass 100% aller Nährstoffe in die Zellen gelangen.",
        "example_good": "Das NTC ist eine von PM entwickelte Technologie, die darauf ausgelegt ist, die Bioverfügbarkeit der Nährstoffe zu verbessern.",
        "applies_to": ["messages", "posts", "presentations"],
        "legal_reference": "HCVO"
    },
    
    # Athleten-Claims
    {
        "rule_name": "athlete_claims_accuracy",
        "rule_description": "Athleten-Behauptungen müssen verifizierbar sein",
        "severity": "suggest",
        "trigger_patterns": [
            r"alle.*Sportler.*nutzen",
            r"jeder.*Olympiasieger",
            r"offizieller.*Sponsor.*Olympia",
        ],
        "replacement_suggestion": "Formuliere korrekt: 'Über 1.000 Sportler nutzen FitLine' oder nenne konkrete Namen",
        "example_bad": "Alle Olympiasieger nehmen FitLine!",
        "example_good": "Über 1.000 Spitzensportler weltweit nutzen FitLine, darunter mehrere Olympiasieger und Weltmeister aus verschiedenen Sportarten.",
        "applies_to": ["messages", "posts", "presentations"],
        "legal_reference": "UWG §5"
    },
    
    # Made in Germany
    {
        "rule_name": "made_in_germany_accuracy",
        "rule_description": "Made in Germany korrekt kommunizieren",
        "severity": "suggest",
        "trigger_patterns": [
            r"einziges.*deutsches.*Produkt",
            r"nur.*FitLine.*aus.*Deutschland",
        ],
        "replacement_suggestion": "Formuliere korrekt: 'FitLine wird in Deutschland entwickelt und produziert'",
        "example_bad": "FitLine ist das einzige deutsche Supplement auf dem Markt.",
        "example_good": "FitLine wird in Deutschland entwickelt und produziert – mit deutschen Qualitätsstandards.",
        "applies_to": ["messages", "posts"],
        "legal_reference": "UWG"
    },
]


# =============================================================================
# CHIEF PROMPTS
# =============================================================================

PM_MODE_PROMPT = """
[PM-INTERNATIONAL / FITLINE MODE – COMPLIANCE & TONE]

Du kommunizierst im Kontext von PM-International – einem deutschen Unternehmen
für Premium-Nahrungsergänzung und Sport-Nutrition mit dem NTC (Nutrient Transport Concept).

═══════════════════════════════════════════════════════════════════════════════
COMPLIANCE REGELN (STRIKTE EINHALTUNG)
═══════════════════════════════════════════════════════════════════════════════

1. KEINE HEILVERSPRECHEN
   ❌ "FitLine heilt chronische Müdigkeit"
   ❌ "Mit FitLine werden Sie nie wieder krank"
   ❌ "Kuriert Krankheit X"
   
   ✅ "Viele Kunden berichten von mehr Energie"
   ✅ "Unterstützt den normalen Energiestoffwechsel"
   ✅ "Trägt zur normalen Funktion des Immunsystems bei" (EFSA-Claim)

2. KEINE EINKOMMENSGARANTIEN
   ❌ "Du verdienst garantiert X€ im Monat"
   ❌ "Schnell reich werden mit PM"
   
   ✅ "Einkommen hängt von deinem Einsatz ab"
   ✅ "Transparentes Vergütungsmodell"
   ✅ "PM wurde rechtlich geprüft und bestätigt (OLG Frankfurt)"

3. NTC KORREKT ERKLÄREN
   ❌ "NTC garantiert 100% Aufnahme"
   
   ✅ "NTC ist darauf ausgelegt, die Bioverfügbarkeit zu verbessern"
   ✅ "NTC schützt Nährstoffe auf dem Weg durch den Körper"

4. ATHLETEN-CLAIMS VERIFIZIERBAR
   ❌ "Alle Olympiasieger nutzen FitLine"
   
   ✅ "Über 1.000 Spitzensportler weltweit"
   ✅ Konkrete Namen nennen wenn bekannt

═══════════════════════════════════════════════════════════════════════════════
TON & STIL
═══════════════════════════════════════════════════════════════════════════════

• Deutsch-seriös, qualitätsbewusst
• Selbstbewusst, aber nicht arrogant
• Faktenbasiert mit echten Beispielen
• "Made in Germany" als Qualitätsmerkmal

═══════════════════════════════════════════════════════════════════════════════
KERNBOTSCHAFTEN
═══════════════════════════════════════════════════════════════════════════════

• NTC: Nährstoffe kommen dort an, wo sie gebraucht werden
• Made in Germany: Deutsche Qualitätsstandards
• Spitzensportler: Wenn es für Olympiasieger gut genug ist...
• 30+ Jahre Erfahrung: Solides, gewachsenes Unternehmen
• Basics → Activize → Restorate: Das 24-Stunden-System

═══════════════════════════════════════════════════════════════════════════════
TYPISCHE EINWÄNDE UND ANTWORTEN
═══════════════════════════════════════════════════════════════════════════════

"Ist das MLM?"
→ Ja, PM nutzt Network Marketing. Das Unternehmen wurde 2011 vom OLG Frankfurt
  rechtlich geprüft und als seriös bestätigt. Der Fokus liegt auf echten Produkten,
  nicht auf Anwerben.

"Zu teuer"
→ Ca. 1,50€ am Tag. Weniger als ein Kaffee. Aber statt 2 Stunden Energie:
  Stabile Energie den ganzen Tag.

"Brauche ich das?"
→ Unsere moderne Ernährung deckt oft nicht alles ab. Die Frage ist nicht ob,
  sondern welche Qualität. Mit FitLine bekommst du Premium-Qualität mit NTC.
"""


# =============================================================================
# EXPORT FUNCTION
# =============================================================================

def get_pm_international_seed_data() -> Dict[str, Any]:
    """Gibt alle PM-International Seed-Daten zurück"""
    return {
        "company": PM_COMPANY,
        "stories": PM_STORIES,
        "products": PM_PRODUCTS,
        "guardrails": PM_GUARDRAILS,
        "chief_prompt": PM_MODE_PROMPT,
    }
