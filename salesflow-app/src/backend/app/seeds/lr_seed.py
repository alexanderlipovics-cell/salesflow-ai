"""
LR Health & Beauty Seed Data
More Quality for Your Life
"""

from typing import Dict, Any, List


# =============================================================================
# COMPANY CONFIG
# =============================================================================

LR_COMPANY: Dict[str, Any] = {
    "name": "LR Health & Beauty",
    "slug": "lr",
    "vertical": "network_marketing",
    "description": "Deutsches Direktvertriebs-Unternehmen für Gesundheits- und Schönheitsprodukte mit Fokus auf Aloe Vera",
    "website": "https://www.lrworld.com",
    "compliance_level": "strict",
    "brand_config": {
        "primary_color": "#009FE3",
        "secondary_color": "#E30613",
        "country": "DE",
        "founded_year": 1985,
        "headquarters": "Ahlen, Deutschland",
        "business_model": "network_marketing",
        "product_focus": ["aloe_vera", "supplements", "parfum", "skincare"],
        "key_differentiator": "aloe_vera_expertise",
        "tagline": "More Quality for Your Life",
    }
}


# =============================================================================
# STORIES
# =============================================================================

LR_STORIES: List[Dict[str, Any]] = [
    {
        "story_type": "elevator_pitch",
        "audience": "consumer",
        "title": "LR in 30 Sekunden",
        "content_30s": """LR Health & Beauty ist ein deutsches Unternehmen, das seit fast 40 Jahren für Qualität steht.

Unser Fokus: Aloe Vera. Wir haben eigene Plantagen, eigene Produktion und über 200 Produkte – von Nahrungsergänzung über Kosmetik bis Parfum.

Was uns unterscheidet? Deutsche Qualität, faire Preise und ein persönlicher Berater, der dich kennt. Keine anonyme Online-Bestellung, sondern echte Betreuung.""",
        "use_case": "Erstkontakt, wenn jemand fragt 'Was ist LR?'",
        "channel_hints": ["instagram", "whatsapp", "facebook"],
        "tags": ["intro", "overview", "aloe_vera"],
        "source_document": "LR-Brand-Guide",
    },
    
    {
        "story_type": "short_story",
        "audience": "consumer",
        "title": "Die LR-Geschichte (2 Min)",
        "content_2min": """LR wurde 1985 in Ahlen gegründet – mitten im Münsterland. Was als kleine Firma startete, ist heute in über 28 Ländern aktiv.

Der Fokus war von Anfang an: Aloe Vera. Diese Wunderpflanze mit ihren 200+ Wirkstoffen bildet das Herzstück unserer Produkte.

Wir haben eigene Aloe-Plantagen und kontrollieren die komplette Lieferkette. Das Ergebnis: Einer der höchsten Aloe-Vera-Gehalte am Markt – zertifiziert durch das IASC (International Aloe Science Council).

Aber LR ist mehr als Aloe. Wir haben Parfums entwickelt mit Starparfümeur Marc vom Ende, Kosmetik-Serien für jeden Hauttyp und Nahrungsergänzung für verschiedene Bedürfnisse.

Und das Beste: Du kaufst nicht bei einem anonymen Online-Shop. Du hast einen LR-Partner, der dich berät, der deine Haut kennt, der weiß was zu dir passt.

Das ist der LR-Unterschied: Deutsche Qualität, persönliche Beratung, faire Chance für alle.""",
        "use_case": "Ausführlichere Erklärung",
        "channel_hints": ["call", "video", "meeting"],
        "tags": ["story", "founder", "aloe_vera", "quality"],
        "source_document": "LR-Brand-Guide",
    },
    
    {
        "story_type": "why_story",
        "audience": "business_partner",
        "title": "Warum LR als Business?",
        "content_2min": """Warum LR? Lass mich dir drei Dinge sagen:

Erstens: Das Produkt. LR-Produkte verkaufen sich quasi von selbst. Wer einmal das Aloe Vera Drinking Gel probiert hat, bestellt nach. Die Kundenbindung ist enorm.

Zweitens: Deutsche Firma, fairer Plan. LR ist kein amerikanischer Konzern mit undurchsichtigen Strukturen. Ein deutsches Familienunternehmen mit klarem Vergütungsplan. Du weißt genau, was du verdienst.

Drittens: Die Vielfalt. Parfum, Kosmetik, Nahrungsergänzung – du erreichst jeden Kunden. Die Frau, die Parfum liebt. Den Mann, der was für seine Gesundheit tun will. Die Familie, die auf Qualität achtet.

Und der Support ist erstklassig. Trainings, Events, eine echte Community. Du bist nie allein.

Ob Nebeneinkommen oder Karriere – LR gibt dir die Werkzeuge.""",
        "use_case": "Business-Opportunity Gespräch",
        "channel_hints": ["call", "zoom", "meeting"],
        "tags": ["business", "opportunity", "german_quality"],
        "source_document": "LR-Business-Guide",
    },
    
    {
        "story_type": "product_story",
        "audience": "consumer",
        "title": "Das Aloe Vera Drinking Gel erklärt",
        "content_1min": """Stell dir vor, du könntest die Power von 200+ natürlichen Wirkstoffen jeden Morgen trinken.

Das ist unser Aloe Vera Drinking Gel. 90% reines Aloe-Vera-Blattgel aus kontrolliertem Anbau. Kein Konzentrat, kein Pulver – echte Pflanzenkraft.

Es unterstützt deine Verdauung, dein Immunsystem und dein allgemeines Wohlbefinden. Viele Kunden berichten von mehr Energie und besserer Haut.

Der Geschmack? Mild, leicht süß – Honey schmeckt fast wie ein Wellness-Drink. Sivera mit Brennnessel ist etwas herber, aber super für die Entgiftung.

3 Esslöffel am Morgen, am besten vor dem Frühstück. Das war's. So einfach kann Gesundheit sein.""",
        "use_case": "Produkt-Erklärung bei Interesse",
        "channel_hints": ["chat", "call", "dm"],
        "tags": ["product", "aloe_vera", "drinking_gel"],
        "source_document": "LR-Product-Guide",
    },
    
    {
        "story_type": "objection_story",
        "audience": "skeptic",
        "title": "Einwand: 'Ist das nicht nur Marketing?'",
        "content_1min": """Verstehe ich. Es gibt viele Aloe-Produkte da draußen, und die meisten sind wirklich nur Marketing.

Aber schau dir das an: LR hat das IASC-Zertifikat. Das ist der internationale Aloe-Vera-Standard. Nicht jeder bekommt das.

Wir kontrollieren die komplette Kette – von der Plantage bis zur Flasche. 90% Blattgel-Gehalt, keine Füllstoffe, keine billigen Konzentrate.

Und LR gibt es seit fast 40 Jahren. In Deutschland. Mit echten Mitarbeitern, echten Lagern, echtem Service. Wenn das nur Marketing wäre, hätten wir nicht Millionen zufriedene Kunden.

Mein Vorschlag: Probier's 4 Wochen. Nicht weil ich es sage – sondern weil du dann selbst entscheiden kannst.""",
        "use_case": "Wenn jemand an Qualität zweifelt",
        "channel_hints": ["chat", "call", "dm"],
        "tags": ["objection", "quality", "proof"],
        "source_document": "LR-Objection-Handling",
    },
]


# =============================================================================
# PRODUCTS
# =============================================================================

LR_PRODUCTS: List[Dict[str, Any]] = [
    {
        "name": "Aloe Vera Drinking Gel",
        "slug": "aloe_vera_drinking_gel",
        "category": "supplements",
        "tagline": "Die Kraft der Aloe – trinkbar",
        "description_short": "90% reines Aloe Vera Blattgel für tägliches Wohlbefinden.",
        "description_full": """Das Aloe Vera Drinking Gel ist LRs Flagship-Produkt.

Inhalt:
• 90% reines Aloe Vera Blattgel
• Keine Konzentrate oder Pulver
• IASC-zertifizierte Qualität
• Reich an natürlichen Wirkstoffen

Verfügbare Varianten:
• Honey: Mit natürlichem Honig, mild & süß
• Sivera: Mit Brennnessel, herb & entgiftend
• Peach: Mit Pfirsich-Geschmack
• Freedom: Mit MSM, Chondroitin & Glucosamin für Gelenke""",
        "key_benefits": [
            "Unterstützt die Verdauung",
            "Stärkt das Immunsystem",
            "Fördert das allgemeine Wohlbefinden",
            "Kann zur Hautverbesserung beitragen"
        ],
        "science_summary": "90% Blattgel, IASC-zertifiziert, 200+ natürliche Inhaltsstoffe",
        "price_hint": "Ab ca. 25€ pro Flasche",
        "subscription_available": True,
        "how_to_explain": "Stell dir vor, du nimmst die beste Kraft aus der Aloe-Pflanze und trinkst sie einfach. Ohne Tabletten, ohne Kapseln – natürlich.",
        "common_objections": ["Schmeckt das?", "Wirkt das wirklich?", "Gibt's doch auch im Supermarkt"],
        "sort_order": 1
    },
    {
        "name": "Mind Master",
        "slug": "mind_master",
        "category": "supplements",
        "tagline": "Schutz vor oxidativem Stress",
        "description_short": "Anti-Stress-Drink mit Antioxidantien und Aloe Vera.",
        "description_full": """Mind Master ist LRs Antwort auf modernen Stress.

Kombination aus:
• Aloe Vera Gel
• Traubenkern-Extrakt (OPC)
• Grüntee-Extrakt
• Resveratrol
• Vitamin E

Schützt die Zellen vor oxidativem Stress und unterstützt mentale Klarheit.""",
        "key_benefits": [
            "Zellschutz durch Antioxidantien",
            "Unterstützt geistige Leistungsfähigkeit",
            "Reduziert oxidativen Stress",
            "Leckerer Geschmack"
        ],
        "price_hint": "Ab ca. 30€",
        "subscription_available": True,
        "how_to_explain": "Für alle, die viel Stress haben – im Job, im Alltag. Mind Master gibt deinen Zellen den Schutz, den sie brauchen.",
        "common_objections": ["Was ist oxidativer Stress?", "Brauche ich das?"],
        "sort_order": 2
    },
    {
        "name": "LR ZEITGARD",
        "slug": "zeitgard",
        "category": "skincare",
        "tagline": "Anti-Aging mit System",
        "description_short": "Professionelle Anti-Aging Kosmetiklinie mit patentierten Wirkstoffen.",
        "description_full": """ZEITGARD ist LRs Premium-Anti-Aging-Serie.

Das System umfasst:
• Cleansing System mit Ultraschall
• Serums mit Hyaluronsäure
• Day & Night Creams
• Eye Contour Gel

Patentierte Wirkstoffe für sichtbare Ergebnisse in 4 Wochen.""",
        "key_benefits": [
            "Sichtbare Faltenreduktion",
            "Verbesserte Hautstruktur",
            "Tiefenreinigung mit Ultraschall",
            "Made in Germany"
        ],
        "price_hint": "Ab ca. 40€ pro Produkt, Sets ab 120€",
        "subscription_available": True,
        "how_to_explain": "Professionelles Anti-Aging, wie im Kosmetikstudio – aber zuhause. Das Cleansing System allein macht schon einen riesigen Unterschied.",
        "common_objections": ["Zu teuer", "Brauche ich alles?", "Ich bin noch zu jung"],
        "sort_order": 3
    },
    {
        "name": "Guido Maria Kretschmer Parfums",
        "slug": "gmk_parfum",
        "category": "parfum",
        "tagline": "Von Guido – für alle",
        "description_short": "Exklusive Parfum-Kollektion in Zusammenarbeit mit Guido Maria Kretschmer.",
        "description_full": """Die GMK-Kollektion bringt Star-Parfum zu fairen Preisen.

Düfte für Damen und Herren:
• Elegant, aber nicht übertrieben
• Langanhaltend
• Hochwertige Inhaltsstoffe
• Designed by Guido Maria Kretschmer

Perfekt als Geschenk oder für den eigenen Alltag.""",
        "key_benefits": [
            "Promi-Duft zu fairem Preis",
            "Hochwertige Komposition",
            "Langanhaltend",
            "Schöne Verpackung"
        ],
        "price_hint": "Ab ca. 35€",
        "subscription_available": False,
        "how_to_explain": "Kennst du Guido aus Shopping Queen? Seine Düfte sind wie er: Stylisch, zugänglich, mit dem gewissen Etwas.",
        "common_objections": ["Ich mag keine Promi-Produkte", "Riecht das nach Mainstream?"],
        "sort_order": 4
    },
]


# =============================================================================
# GUARDRAILS
# =============================================================================

LR_GUARDRAILS: List[Dict[str, Any]] = [
    {
        "rule_name": "no_healing_claims",
        "rule_description": "Keine Heilversprechen für Nahrungsergänzung",
        "severity": "block",
        "trigger_patterns": [
            r"\bheilt\b", r"\bkuriert\b",
            r"Krankheit.*behandeln", r"Krebs.*vorbeugen",
            r"Diabetes.*heilen"
        ],
        "replacement_suggestion": "Sage 'unterstützt das Wohlbefinden' statt 'heilt'",
        "example_bad": "Aloe Vera heilt Darmprobleme!",
        "example_good": "Aloe Vera kann die Verdauung unterstützen und zum allgemeinen Wohlbefinden beitragen.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "HCVO, LFGB"
    },
    {
        "rule_name": "no_income_guarantees",
        "rule_description": "Keine Einkommensgarantien",
        "severity": "block",
        "trigger_patterns": [
            r"garantiert.*verdienen", r"sicher.*Einkommen",
            r"\d+€.*pro.*Monat.*garantiert",
            r"schnell.*reich"
        ],
        "replacement_suggestion": "Einkommen hängt vom individuellen Einsatz ab",
        "example_bad": "Mit LR verdienst du garantiert 2.000€ im Monat!",
        "example_good": "Dein Einkommen bei LR hängt von deinem Engagement und deinem Netzwerk ab.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "UWG, MLM-Richtlinien"
    },
    {
        "rule_name": "iasc_certification",
        "rule_description": "IASC-Zertifizierung korrekt erwähnen",
        "severity": "suggest",
        "trigger_patterns": [
            r"beste.*Aloe",
            r"einzig.*echte.*Aloe",
            r"reinste.*Aloe"
        ],
        "replacement_suggestion": "Verweise auf IASC-Zertifizierung als Qualitätsnachweis",
        "example_bad": "Wir haben die beste Aloe der Welt!",
        "example_good": "Unsere Aloe Vera ist IASC-zertifiziert – das internationale Gütesiegel für Aloe-Qualität.",
        "applies_to": ["posts", "ads"],
        "legal_reference": "Werbungsrichtlinien"
    },
    {
        "rule_name": "partner_disclosure",
        "rule_description": "Als LR-Partner kennzeichnen",
        "severity": "suggest",
        "trigger_patterns": [
            r"empfehle.*LR",
            r"kauf.*bei.*LR",
            r"bestell.*LR"
        ],
        "replacement_suggestion": "Kennzeichne dich als 'Selbstständiger LR-Partner'",
        "example_bad": "Ich empfehle dir LR!",
        "example_good": "Als LR-Partner kann ich dir Produkte empfehlen, die zu dir passen.",
        "applies_to": ["posts", "ads"],
        "legal_reference": "Kennzeichnungspflicht"
    },
]


# =============================================================================
# CHIEF PROMPT
# =============================================================================

LR_MODE_PROMPT = """
[LR-MODE – COMPLIANCE & TONE]

Du kommunizierst im Kontext von LR Health & Beauty – einem deutschen Direktvertriebs-Unternehmen
mit Fokus auf Aloe Vera und Lifestyle-Produkte.

═══════════════════════════════════════════════════════════════════════════════
COMPLIANCE REGELN
═══════════════════════════════════════════════════════════════════════════════

1. KEINE HEILVERSPRECHEN
   ❌ "Aloe Vera heilt..."
   ✅ "Aloe Vera kann das Wohlbefinden unterstützen"

2. KEINE EINKOMMENSGARANTIEN
   ❌ "Verdiene garantiert X€"
   ✅ "Einkommen hängt von deinem Einsatz ab"

3. QUALITÄT MIT NACHWEIS
   → IASC-Zertifizierung erwähnen
   → "Made in Germany" nutzen

═══════════════════════════════════════════════════════════════════════════════
TON & STIL
═══════════════════════════════════════════════════════════════════════════════

• Bodenständig und ehrlich
• Deutsche Qualität betonen
• Persönliche Beratung hervorheben
• Familienunternehmen-Charakter

═══════════════════════════════════════════════════════════════════════════════
KERNBOTSCHAFTEN
═══════════════════════════════════════════════════════════════════════════════

• More Quality for Your Life
• Fast 40 Jahre Erfahrung
• IASC-zertifizierte Aloe Vera
• Deutsche Produktion und Qualität
• Persönlicher LR-Partner statt anonymem Online-Shop
"""


# =============================================================================
# EXPORT
# =============================================================================

def get_lr_seed_data() -> Dict[str, Any]:
    """Gibt alle LR Seed-Daten zurück"""
    return {
        "company": LR_COMPANY,
        "stories": LR_STORIES,
        "products": LR_PRODUCTS,
        "guardrails": LR_GUARDRAILS,
        "chief_prompt": LR_MODE_PROMPT,
    }

