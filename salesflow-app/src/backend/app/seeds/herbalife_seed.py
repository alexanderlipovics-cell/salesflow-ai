"""
Herbalife Seed Data
Nutrition for a Better Life
"""

from typing import Dict, Any, List


# =============================================================================
# COMPANY CONFIG
# =============================================================================

HERBALIFE_COMPANY: Dict[str, Any] = {
    "name": "Herbalife",
    "slug": "herbalife",
    "vertical": "network_marketing",
    "description": "Globales Ernährungs- und Wellness-Unternehmen mit Fokus auf Gewichtsmanagement und aktiven Lebensstil",
    "website": "https://www.herbalife.com",
    "compliance_level": "strict",
    "brand_config": {
        "primary_color": "#00A94F",
        "secondary_color": "#78BE20",
        "country": "US",
        "founded_year": 1980,
        "headquarters": "Los Angeles, USA",
        "business_model": "network_marketing",
        "product_focus": ["weight_management", "nutrition", "sports", "skincare"],
        "key_differentiator": "personalized_nutrition_coaching",
        "tagline": "Nutrition for a Better Life",
    }
}


# =============================================================================
# STORIES
# =============================================================================

HERBALIFE_STORIES: List[Dict[str, Any]] = [
    # Elevator Pitch
    {
        "story_type": "elevator_pitch",
        "audience": "consumer",
        "title": "Herbalife in 30 Sekunden",
        "content_30s": """Herbalife ist ein globales Ernährungs-Unternehmen, das seit über 40 Jahren Menschen hilft, ihre Gesundheitsziele zu erreichen.

Ob Gewichtsmanagement, mehr Energie oder bessere Fitness – wir haben wissenschaftlich fundierte Produkte, die zu deinem Lebensstil passen.

Das Besondere: Du bekommst nicht nur Produkte, sondern einen persönlichen Coach, der dich auf deinem Weg begleitet. Kein Alleingang, keine Diät-Frust – sondern echte Unterstützung.""",
        "use_case": "Erstkontakt, wenn jemand fragt 'Was ist Herbalife?'",
        "channel_hints": ["instagram", "whatsapp", "facebook"],
        "tags": ["intro", "overview", "nutrition"],
        "source_document": "Herbalife-Brand-Guide",
    },
    
    # 2-Minuten Story
    {
        "story_type": "short_story",
        "audience": "consumer",
        "title": "Die Herbalife-Geschichte (2 Min)",
        "content_2min": """Kennst du das? Du hast schon x Diäten probiert, aber nichts funktioniert langfristig?

Genau so ging es Mark Hughes, dem Gründer von Herbalife. Nach dem Tod seiner Mutter durch eine Crash-Diät schwor er sich: Es muss einen besseren Weg geben.

1980 gründete er Herbalife mit einer einfachen Idee: Gesunde Ernährung sollte einfach, lecker und nachhaltig sein. Keine Hungerkuren, kein Verzicht – sondern ausgewogene Mahlzeiten, die ins echte Leben passen.

Heute sind wir in über 90 Ländern aktiv und haben Millionen Menschen geholfen. Unsere Produkte werden von Wissenschaftlern entwickelt und von Sportlern weltweit genutzt – von Freizeitsportlern bis zu Olympia-Teams.

Aber das Wichtigste ist nicht das Produkt allein. Es ist die Community. Dein persönlicher Coach, Gruppen-Challenges, lokale Fit-Clubs. Du bist nie allein auf deinem Weg.

Das ist Herbalife: Nicht einfach Shakes verkaufen. Sondern Menschen helfen, die beste Version von sich selbst zu werden.""",
        "use_case": "Ausführlichere Erklärung bei echtem Interesse",
        "channel_hints": ["call", "video", "presentation"],
        "tags": ["story", "founder", "community"],
        "source_document": "Herbalife-Brand-Guide",
    },
    
    # Business Partner Story
    {
        "story_type": "why_story",
        "audience": "business_partner",
        "title": "Warum Herbalife als Business?",
        "content_2min": """Du suchst nach einem Business, das zu dir passt? Lass mich dir erzählen, warum Herbalife anders ist.

Erstens: Das Produkt funktioniert. Millionen zufriedene Kunden weltweit. Wenn du selbst die Ergebnisse siehst, verkaufst du nicht – du teilst.

Zweitens: Die Ausbildung. Herbalife investiert massiv in deine Entwicklung. Online-Trainings, Events, persönliches Mentoring. Du lernst nicht nur Vertrieb, sondern auch Ernährungswissen.

Drittens: Die Flexibilität. Ob Vollzeit oder nebenher, ob online oder mit Fit-Club – du entscheidest, wie du arbeitest. Dein Business, deine Regeln.

Viertens: Die Community. Du bist Teil einer globalen Familie. Events, Incentive-Reisen, eine echte Kultur der Unterstützung.

Und das Wichtigste: Du hilfst Menschen. Jeden Tag siehst du, wie deine Kunden fitter werden, mehr Energie haben, glücklicher sind. Das ist mehr als ein Job – das ist eine Mission.""",
        "use_case": "Wenn jemand über Business-Möglichkeit nachdenkt",
        "channel_hints": ["call", "zoom", "coffee"],
        "tags": ["business", "opportunity", "flexibility"],
        "source_document": "Herbalife-Business-Guide",
    },
    
    # Einwand: "Ist das nicht ungesund?"
    {
        "story_type": "objection_story",
        "audience": "skeptic",
        "title": "Einwand: 'Shakes sind doch ungesund'",
        "content_1min": """Das höre ich oft. Und ich verstehe es – es gibt viele fragwürdige Produkte auf dem Markt.

Aber Herbalife ist anders. Warum?

Erstens: Wir haben ein eigenes Wissenschafts-Institut mit über 300 Wissenschaftlern. Unsere Produkte werden nicht zusammengeklatscht, sondern entwickelt.

Zweitens: Wir sind kein Mahlzeitenersatz für immer. Es geht um Balance. Ein Shake zum Frühstück, normale Mahlzeiten sonst. Plus Snacks, Proteine, Vitamine – je nachdem was du brauchst.

Drittens: Die Qualität. Unsere Inhaltsstoffe werden auf 50+ Parameter getestet. Viele professionelle Sportler nutzen unsere Produkte – glaubst du, die würden etwas Fragwürdiges nehmen?

Am Ende zählt: Wie fühlst du dich? Probier es 3 Tage und entscheide selbst.""",
        "use_case": "Wenn jemand Bedenken wegen 'Shake-Diäten' hat",
        "channel_hints": ["chat", "call", "dm"],
        "tags": ["objection", "quality", "science"],
        "source_document": "Herbalife-Objection-Handling",
    },
    
    # Erfolgsgeschichte
    {
        "story_type": "success_story",
        "audience": "consumer",
        "title": "Lisa's Transformation",
        "content_1min": """Lisa kam zu mir nach der Geburt ihres zweiten Kindes. 15 Kilo zu viel, keine Energie, frustriert von jeder Diät.

Sie startete mit dem Frühstücks-Shake und einem einfachen Plan. Keine radikalen Änderungen, kleine Schritte.

Nach 3 Monaten: 8 Kilo weniger, mehr Energie als vor der Schwangerschaft, und sie schläft endlich durch.

Heute, ein Jahr später, ist sie selbst Herbalife-Coach. Nicht wegen des Geldes – sondern weil sie diese Erfahrung teilen wollte.

Das ist, was mich antreibt: Echte Transformationen zu sehen. Nicht nur auf der Waage, sondern im ganzen Leben.""",
        "use_case": "Wenn jemand Beispiele für Erfolge braucht",
        "channel_hints": ["instagram", "facebook", "presentation"],
        "tags": ["success", "transformation", "testimonial"],
        "source_document": "Herbalife-Success-Stories",
    },
]


# =============================================================================
# PRODUCTS
# =============================================================================

HERBALIFE_PRODUCTS: List[Dict[str, Any]] = [
    {
        "name": "Formula 1 Shake",
        "slug": "formula_1",
        "category": "nutrition",
        "tagline": "Gesunde Mahlzeit in 2 Minuten",
        "description_short": "Ausgewogener Mahlzeitenersatz-Shake mit Proteinen, Vitaminen und Mineralstoffen.",
        "description_full": """Formula 1 ist das Herzstück der Herbalife-Ernährung.

Ein Shake liefert:
• Hochwertiges Protein (Soja & Milch)
• 21 Vitamine und Mineralstoffe
• Ballaststoffe für Sättigung
• Nur ca. 220 kcal pro Portion

Erhältlich in vielen Geschmacksrichtungen: Vanille, Schoko, Erdbeere, Cookies & Cream, Banane, Café Latte, und mehr.

Einfach mit Milch oder Pflanzendrink mixen – fertig ist eine komplette Mahlzeit.""",
        "key_benefits": [
            "Schnell zubereitet – ideal für stressige Morgen",
            "Kontrollierte Kalorien bei voller Nährstoffversorgung",
            "Hält lange satt durch Protein & Ballaststoffe",
            "Lecker – auch langfristig genießbar"
        ],
        "science_summary": "25g Protein pro Portion, 21 Vitamine/Mineralstoffe, ca. 220 kcal",
        "price_hint": "Ab ca. 50€ für 30 Portionen",
        "subscription_available": True,
        "how_to_explain": "Stell es dir vor wie ein gesundes Fast-Food. In 2 Minuten eine komplette Mahlzeit – aber ohne die negativen Effekte.",
        "common_objections": ["Schmeckt das?", "Ist das nicht langweilig jeden Tag?", "Zu teuer"],
        "sort_order": 1
    },
    {
        "name": "Protein Drink Mix",
        "slug": "protein_drink_mix",
        "category": "sports",
        "tagline": "Power für deine Muskeln",
        "description_short": "Hochwertiges Protein für Muskelaufbau und Regeneration.",
        "description_full": """Protein Drink Mix liefert zusätzliches Protein für:
• Muskelaufbau nach dem Training
• Bessere Sättigung zwischen Mahlzeiten
• Optimale Regeneration

Kann allein getrunken oder dem Formula 1 Shake hinzugefügt werden für extra Protein-Boost.""",
        "key_benefits": [
            "15g Protein pro Portion",
            "Unterstützt Muskelaufbau und -erhalt",
            "Ideal nach dem Training",
            "Geschmacksneutral oder Vanille"
        ],
        "price_hint": "Ab ca. 40€",
        "subscription_available": True,
        "how_to_explain": "Das ist dein Protein-Upgrade. Gibst du zum Shake dazu wenn du trainierst oder mehr Sättigung brauchst.",
        "common_objections": ["Brauche ich das wirklich?", "Ich trainiere nicht so viel"],
        "sort_order": 2
    },
    {
        "name": "Herbal Tea Concentrate",
        "slug": "herbal_tea",
        "category": "energy",
        "tagline": "Energie ohne Crash",
        "description_short": "Erfrischender Tee mit Koffein aus grünem und schwarzem Tee.",
        "description_full": """Der Herbal Tea Concentrate ist perfekt für:
• Einen Energie-Boost am Morgen
• Konzentration am Nachmittag
• Als kalorienarme Alternative zu Kaffee

Enthält Koffein aus natürlichen Quellen – gibt Energie, aber ohne den typischen Kaffee-Crash.""",
        "key_benefits": [
            "Nur 6 kcal pro Portion",
            "Koffein aus grünem & schwarzem Tee",
            "Verschiedene Geschmacksrichtungen",
            "Heiß oder kalt genießbar"
        ],
        "price_hint": "Ab ca. 35€",
        "subscription_available": True,
        "how_to_explain": "Dein gesunder Kaffee-Ersatz. Gibt dir Energie, aber ohne Zucker und mit weniger Säure.",
        "common_objections": ["Ich trinke lieber Kaffee", "Hat das nicht zu viel Koffein?"],
        "sort_order": 3
    },
    {
        "name": "Herbalife24 CR7 Drive",
        "slug": "cr7_drive",
        "category": "sports",
        "tagline": "Entwickelt mit Cristiano Ronaldo",
        "description_short": "Isotonisches Sportgetränk für optimale Hydration während des Trainings.",
        "description_full": """CR7 Drive wurde in Zusammenarbeit mit Cristiano Ronaldo entwickelt.

Liefert:
• Elektrolyte für Hydration
• Kohlenhydrate für Energie
• B-Vitamine für den Stoffwechsel

Ideal vor, während oder nach dem Training für optimale Leistung.""",
        "key_benefits": [
            "Schnelle Hydration durch Elektrolyte",
            "Kohlenhydrate für anhaltende Energie",
            "Entwickelt für Spitzensportler",
            "Erfrischender Geschmack"
        ],
        "price_hint": "Ab ca. 35€",
        "subscription_available": True,
        "how_to_explain": "Das ist das Sportgetränk, das auch Ronaldo nutzt. Für alle, die beim Sport das Maximum rausholen wollen.",
        "common_objections": ["Brauche ich nur wenn ich Profi bin", "Wasser reicht doch"],
        "sort_order": 4
    },
]


# =============================================================================
# GUARDRAILS
# =============================================================================

HERBALIFE_GUARDRAILS: List[Dict[str, Any]] = [
    {
        "rule_name": "no_weight_loss_guarantees",
        "rule_description": "Keine garantierten Gewichtsverlust-Versprechen",
        "severity": "block",
        "trigger_patterns": [
            r"garantiert.*abnehmen", r"sicher.*\d+.*kg",
            r"in.*\d+.*Wochen.*abnehmen",
            r"Wunder.*Diät", r"ohne.*Sport.*abnehmen"
        ],
        "replacement_suggestion": "Formuliere individuell: 'Ergebnisse variieren je nach Einsatz und Lebensstil'",
        "example_bad": "Mit Formula 1 nimmst du garantiert 5kg in 2 Wochen ab!",
        "example_good": "Viele Kunden berichten von positiven Ergebnissen. Wie schnell du deine Ziele erreichst, hängt von deinem Einsatz und Lebensstil ab.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "FTC Guidelines, HCVO"
    },
    {
        "rule_name": "no_medical_claims",
        "rule_description": "Keine medizinischen Heilversprechen",
        "severity": "block",
        "trigger_patterns": [
            r"\bheilt\b", r"\bkuriert\b",
            r"Diabetes.*behandeln", r"Krebs.*vorbeugen",
            r"Krankheit.*beseitigen"
        ],
        "replacement_suggestion": "Herbalife-Produkte sind Nahrungsergänzung, keine Medizin",
        "example_bad": "Herbalife heilt Diabetes!",
        "example_good": "Herbalife-Produkte unterstützen einen gesunden Lebensstil. Bei Krankheiten immer einen Arzt konsultieren.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "FTC, FDA, HCVO"
    },
    {
        "rule_name": "no_income_promises",
        "rule_description": "Keine garantierten Einkommensversprechen",
        "severity": "block",
        "trigger_patterns": [
            r"garantiert.*verdienen", r"schnell.*reich",
            r"\d+€.*pro.*Monat.*sicher",
            r"passives.*Einkommen.*garantiert"
        ],
        "replacement_suggestion": "Einkommen hängt von individuellem Einsatz ab",
        "example_bad": "Verdiene garantiert 3.000€ im Monat mit Herbalife!",
        "example_good": "Dein Einkommen hängt von deinem Einsatz, deinen Fähigkeiten und deinem Netzwerk ab. Es gibt keine Garantien – aber ein faires Vergütungssystem.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "FTC, MLM Guidelines"
    },
    {
        "rule_name": "include_disclaimer",
        "rule_description": "Erfolgsgeschichten brauchen Disclaimer",
        "severity": "warn",
        "trigger_patterns": [
            r"ich.*habe.*\d+.*kg.*abgenommen",
            r"Kunde.*hat.*abgenommen",
            r"Transformation.*Ergebnis"
        ],
        "replacement_suggestion": "Füge hinzu: 'Individuelle Ergebnisse können variieren'",
        "example_bad": "Meine Kundin hat 10kg in einem Monat abgenommen!",
        "example_good": "Meine Kundin hat 10kg abgenommen. Individuelle Ergebnisse können variieren und hängen von Ernährung, Bewegung und Einsatz ab.",
        "applies_to": ["posts", "testimonials"],
        "legal_reference": "FTC Endorsement Guidelines"
    },
    {
        "rule_name": "distributor_disclosure",
        "rule_description": "Als Herbalife-Berater kennzeichnen",
        "severity": "suggest",
        "trigger_patterns": [
            r"Herbalife.*empfehlen",
            r"Formula.*1.*kaufen",
            r"probier.*Herbalife"
        ],
        "replacement_suggestion": "Kennzeichne dich als 'Selbstständiger Herbalife-Berater'",
        "example_bad": "Ich empfehle dir Herbalife!",
        "example_good": "Als selbstständiger Herbalife-Berater kann ich dir die Produkte empfehlen, die zu dir passen.",
        "applies_to": ["posts", "ads"],
        "legal_reference": "FTC Disclosure Requirements"
    },
]


# =============================================================================
# CHIEF PROMPT
# =============================================================================

HERBALIFE_MODE_PROMPT = """
[HERBALIFE-MODE – COMPLIANCE & TONE]

Du kommunizierst im Kontext von Herbalife – einem globalen Ernährungs-Unternehmen
für Gewichtsmanagement und aktiven Lebensstil.

═══════════════════════════════════════════════════════════════════════════════
COMPLIANCE REGELN (STRIKTE EINHALTUNG)
═══════════════════════════════════════════════════════════════════════════════

1. KEINE GEWICHTSVERLUST-GARANTIEN
   ❌ "Du wirst garantiert 5kg abnehmen"
   ❌ "In 2 Wochen zur Traumfigur"
   
   ✅ "Ergebnisse variieren individuell"
   ✅ "Mit Engagement und gesunder Ernährung können positive Veränderungen eintreten"

2. KEINE MEDIZINISCHEN CLAIMS
   ❌ "Heilt Diabetes"
   ❌ "Verhindert Krankheiten"
   
   ✅ "Unterstützt einen gesunden Lebensstil"
   ✅ "Bei gesundheitlichen Fragen: Arzt konsultieren"

3. KEINE EINKOMMENSGARANTIEN
   ❌ "Schnell reich werden"
   ❌ "Garantiertes Einkommen"
   
   ✅ "Einkommen hängt von deinem Einsatz ab"

4. DISCLAIMER BEI ERFOLGSGESCHICHTEN
   → Immer erwähnen: "Individuelle Ergebnisse können variieren"

═══════════════════════════════════════════════════════════════════════════════
TON & STIL
═══════════════════════════════════════════════════════════════════════════════

• Motivierend und unterstützend
• Community-Fokus ("Wir schaffen das zusammen")
• Lifestyle-orientiert, nicht Diät-fokussiert
• Energie und Wohlbefinden betonen, nicht nur Gewicht

═══════════════════════════════════════════════════════════════════════════════
KERNBOTSCHAFTEN
═══════════════════════════════════════════════════════════════════════════════

• Nutrition for a Better Life
• Persönliche Betreuung durch Coach
• Wissenschaftlich fundierte Produkte
• Über 40 Jahre Erfahrung
• Globale Community und Events
"""


# =============================================================================
# EXPORT
# =============================================================================

def get_herbalife_seed_data() -> Dict[str, Any]:
    """Gibt alle Herbalife Seed-Daten zurück"""
    return {
        "company": HERBALIFE_COMPANY,
        "stories": HERBALIFE_STORIES,
        "products": HERBALIFE_PRODUCTS,
        "guardrails": HERBALIFE_GUARDRAILS,
        "chief_prompt": HERBALIFE_MODE_PROMPT,
    }

