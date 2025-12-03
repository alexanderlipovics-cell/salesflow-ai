"""
LR Health & Beauty Seed Data
Deutsches MLM-Unternehmen mit Aloe Vera, Parfüm und Kosmetik
"""

from typing import Dict, Any, List


LR_COMPANY: Dict[str, Any] = {
    "name": "LR Health & Beauty",
    "slug": "lr-health-beauty",
    "vertical": "network_marketing",
    "description": "Deutsches Direktvertriebsunternehmen für Aloe Vera Produkte, Parfüm und Kosmetik",
    "website": "https://www.lrworld.com",
    "compliance_level": "strict",
    "brand_config": {
        "primary_color": "#00A550",
        "secondary_color": "#1E3A5F",
        "country": "DE",
        "founded_year": 1985,
        "headquarters": "Ahlen, Deutschland",
        "business_model": "network_marketing",
        "product_focus": ["aloe_vera", "parfum", "kosmetik", "nahrungsergaenzung"],
        "key_differentiator": "aloe_vera_quality",
        "tagline": "More Quality for your Life",
    }
}


LR_STORIES: List[Dict[str, Any]] = [
    {
        "story_type": "elevator_pitch",
        "audience": "consumer",
        "title": "LR in 30 Sekunden",
        "content_30s": """LR ist ein deutsches Familienunternehmen aus Ahlen – seit fast 40 Jahren erfolgreich im Direktvertrieb.

Der Star ist die Aloe Vera: LR baut sie auf eigenen Plantagen an und verarbeitet sie schonend – das macht die Qualität aus. Dazu kommen Parfüms (übrigens von denselben Häusern wie die teuren Marken), Kosmetik und Nahrungsergänzung.

Das Besondere: Deutsche Qualität, faire Preise, und ein Business-Modell das funktioniert – mit über 300.000 Partnern weltweit.

Qualität aus Deutschland. Seit 1985.""",
        "use_case": "Erstkontakt, wenn jemand fragt 'Was ist LR?'",
        "tags": ["intro", "overview", "aloe_vera", "made_in_germany"],
    },
    {
        "story_type": "short_story",
        "audience": "consumer",
        "title": "Warum Aloe Vera von LR?",
        "content_2min": """Aloe Vera gibt's überall – im Drogeriemarkt, in der Apotheke, sogar im Discounter. Warum also LR?

Der Unterschied liegt im Detail:

Erstens: Die Plantagen. LR hat eigene Aloe Vera Plantagen – keine Massenware aus China, sondern kontrollierter Anbau.

Zweitens: Die Verarbeitung. Bei den meisten Produkten wird das Aloe-Gel erhitzt und dabei gehen die wertvollen Inhaltsstoffe verloren. LR verarbeitet schonend – innerhalb von 6 Stunden nach der Ernte.

Drittens: Die Konzentration. Viele "Aloe Vera Produkte" enthalten nur 1-2% Aloe. LR Produkte haben bis zu 98% pures Aloe Vera Gel.

Das Ergebnis spürst du: Bei Hautproblemen, Verdauung, oder einfach als tägliche Pflege – LR Aloe Vera wirkt, weil echte Qualität drin ist.

Nicht das Billigste. Aber das Beste.""",
        "use_case": "Wenn jemand nach dem Unterschied zu anderen Aloe-Produkten fragt",
        "tags": ["aloe_vera", "quality", "differentiation"],
    },
    {
        "story_type": "why_story",
        "audience": "business_partner",
        "title": "Warum LR als Business?",
        "content_2min": """Du überlegst, ins Network Marketing einzusteigen? Hier ist, warum LR eine gute Wahl ist.

Erstens: Die Produkte verkaufen sich. Aloe Vera kennt jeder, Parfüm braucht jeder. Du musst niemanden von einem völlig neuen Konzept überzeugen.

Zweitens: Deutsche Firma, deutsche Qualität. LR sitzt in Ahlen, Nordrhein-Westfalen. Kein amerikanischer Konzern, der morgen die Regeln ändert. Solide, familiengeführt, seit fast 40 Jahren.

Drittens: Faire Preise. LR-Produkte sind Premium, aber nicht überteuert. Das macht den Verkauf einfacher – die Leute sehen das Preis-Leistungs-Verhältnis.

Viertens: Breites Sortiment. Von Aloe Vera über Parfüm bis Kosmetik – für jeden Kunden etwas dabei.

Und das Wichtigste: Du kannst die Produkte mit gutem Gewissen empfehlen. Weil sie funktionieren.""",
        "use_case": "Wenn jemand über das LR Business nachdenkt",
        "tags": ["business", "opportunity", "made_in_germany"],
    },
    {
        "story_type": "objection_story",
        "audience": "skeptic",
        "title": "Einwand: 'Das ist doch MLM'",
        "content_1min": """Ja, LR ist Network Marketing. Und ich verstehe, wenn du skeptisch bist – es gibt leider viele schwarze Schafe in der Branche.

Aber lass mich dir was sagen:

LR gibt es seit 1985. Fast 40 Jahre. In dieser Zeit sind hunderte MLM-Firmen gekommen und gegangen. LR ist geblieben – weil echte Produkte dahinterstehen.

Der Fokus liegt auf Verkauf, nicht auf Anwerben. Du verdienst am Produktumsatz, nicht daran, möglichst viele Leute ins System zu holen.

Und: LR ist Mitglied im Bundesverband Direktvertrieb Deutschland. Reguliert, kontrolliert, seriös.

Ich verstehe die Skepsis. Aber schau dir die Produkte an, probier sie aus. Dann reden wir weiter.""",
        "use_case": "Wenn jemand MLM-Skepsis hat",
        "tags": ["objection", "mlm", "skeptic", "trust"],
    },
    {
        "story_type": "objection_story",
        "audience": "consumer",
        "title": "Einwand: 'Zu teuer'",
        "content_1min": """Ich verstehe. Auf den ersten Blick ist LR teurer als die Aloe-Creme im Drogeriemarkt.

Aber rechnen wir mal:

Die Drogeriemarkt-Creme hat vielleicht 2% Aloe Vera. Der Rest? Wasser, Füllstoffe, Konservierungsmittel.

Die LR-Creme hat bis zu 50% pures Aloe Gel. Du brauchst also weniger, und es wirkt besser.

Wenn du die tatsächliche Menge Aloe Vera pro Euro vergleichst, ist LR sogar günstiger.

Plus: Du hast eine Zufriedenheitsgarantie. Wenn's nicht passt, Geld zurück.

Qualität hat ihren Preis – aber bei LR bekommst du auch Qualität dafür.""",
        "use_case": "Wenn jemand den Preis als Einwand nennt",
        "tags": ["objection", "price", "value", "quality"],
    },
    {
        "story_type": "proof_story",
        "audience": "consumer",
        "title": "Die Parfüm-Story",
        "content_1min": """Wusstest du, dass LR-Parfüms von denselben Häusern kommen wie die großen Marken?

Grasse in Frankreich – die Parfüm-Hauptstadt der Welt. Hier werden Chanel, Dior und Co. hergestellt. Und hier lässt auch LR produzieren.

Der Unterschied: Keine teuren Werbekampagnen mit Hollywoodstars. Keine Luxus-Verpackungen. Kein Einzelhandel mit seinen Aufschlägen.

Das Ergebnis: Premium-Düfte zum fairen Preis. Oft 50-70% günstiger als vergleichbare Markenparfüms.

Das ist nicht "Fake-Parfüm" oder "ähnlich wie". Das ist echte Qualität aus Grasse – nur ohne den Marketing-Overhead.""",
        "use_case": "Um das Parfüm-Sortiment zu erklären",
        "tags": ["parfum", "quality", "value", "grasse"],
    },
]


LR_PRODUCTS: List[Dict[str, Any]] = [
    {
        "name": "Aloe Vera Drinking Gel",
        "slug": "aloe_vera_drinking_gel",
        "category": "aloe_vera",
        "tagline": "Deine tägliche Dosis Aloe",
        "description_short": "Trinkgel mit 98% purem Aloe Vera Gel für tägliche Anwendung.",
        "description_full": """Das Aloe Vera Drinking Gel ist das Flaggschiff-Produkt von LR.

Es enthält:
• 98% pures Aloe Vera Blattgel
• Ohne Aloin (reizende Substanz aus der Blattrinde)
• Schonend verarbeitet innerhalb von 6 Stunden nach der Ernte

Täglich 3x 30ml unterstützen:
• Die Verdauung
• Das Immunsystem
• Die Hautgesundheit von innen

Erhältlich in verschiedenen Geschmacksrichtungen: Honey, Peach, Sivera (ohne Honig).""",
        "key_benefits": [
            "98% pures Aloe Vera Gel",
            "Schonende Verarbeitung",
            "Unterstützt Verdauung und Immunsystem",
            "Verschiedene Geschmacksrichtungen"
        ],
        "how_to_use": "3x täglich 30ml pur oder mit Wasser verdünnt",
        "price_hint": "Ab ca. 25€/Flasche",
        "how_to_explain": "Das Drinking Gel ist wie ein täglicher Service für deinen Körper von innen.",
        "common_objections": ["Schmeckt das?", "Kann ich nicht einfach Aloe-Saft kaufen?"],
        "sort_order": 1
    },
    {
        "name": "Aloe Vera Emergency Spray",
        "slug": "aloe_vera_emergency_spray",
        "category": "aloe_vera",
        "tagline": "Erste Hilfe für die Haut",
        "description_short": "Sofort-Spray mit 83% Aloe Vera für Hautirritationen, Sonnenbrand, kleine Verletzungen.",
        "description_full": """Das Emergency Spray ist der Bestseller für unterwegs.

Mit 83% Aloe Vera Gel hilft es bei:
• Sonnenbrand
• Insektenstichen
• Kleinen Schürfwunden
• Hautirritationen
• Rasurbrand

Das Spray kühlt sofort und unterstützt die natürliche Regeneration der Haut. Ohne Alkohol, ohne Parfüm – sanft auch für empfindliche Haut.""",
        "key_benefits": [
            "83% Aloe Vera",
            "Sofortige Kühlung",
            "Für unterwegs",
            "Sanft für empfindliche Haut"
        ],
        "how_to_use": "Bei Bedarf auf betroffene Hautstellen sprühen",
        "price_hint": "Ab ca. 15€",
        "how_to_explain": "Das Emergency Spray gehört in jede Handtasche und jeden Rucksack – wie ein Pflaster, nur besser.",
        "common_objections": ["Hab ich auch After-Sun zuhause"],
        "sort_order": 2
    },
    {
        "name": "LR Parfum Collection",
        "slug": "lr_parfum_collection",
        "category": "parfum",
        "tagline": "Grasse-Qualität zum fairen Preis",
        "description_short": "Premium-Düfte aus Grasse (Frankreich) – dieselben Parfümeure wie die großen Marken.",
        "description_full": """Die LR Parfum Collection bietet über 20 verschiedene Düfte für Damen und Herren.

Das Besondere:
• Hergestellt in Grasse, der Parfüm-Hauptstadt Frankreichs
• Von denselben Parfümeuren wie Chanel, Dior, etc.
• Ohne teure Werbekampagnen und Luxus-Verpackungen
• Daher 50-70% günstiger als vergleichbare Markenparfüms

Beliebte Düfte:
• Classics (zeitlose Eleganz)
• Guido Maria Kretschmer Collection
• Bruce Willis Collection
• Mind Master Eau de Parfum""",
        "key_benefits": [
            "Grasse-Qualität",
            "50-70% günstiger als Markenparfüms",
            "Große Auswahl für jeden Geschmack",
            "Langanhaltend"
        ],
        "price_hint": "Ab ca. 25€ (50ml)",
        "how_to_explain": "Stell dir vor, du bekommst ein Chanel-ähnliches Parfüm für ein Drittel des Preises – weil kein Hollywoodstar bezahlt werden muss.",
        "common_objections": ["Ist das nicht Fake-Parfüm?", "Hält das auch so lange?"],
        "sort_order": 3
    },
    {
        "name": "Mind Master Brain & Body Performance",
        "slug": "mind_master",
        "category": "nahrungsergaenzung",
        "tagline": "Für Kopf und Körper",
        "description_short": "Anti-Stress-Drink mit Aloe Vera, Vitaminen und Pflanzenextrakten.",
        "description_full": """Mind Master ist das Premium-Nahrungsergänzungsprodukt von LR.

Die Formel kombiniert:
• Aloe Vera Gel als Basis
• Traubenkern-Extrakt (OPC)
• Grüner Tee Extrakt
• Vitamine E, B6, B12
• Eisen und Folsäure

Für Menschen mit:
• Stressigem Alltag
• Hoher geistiger Belastung
• Sportlicher Aktivität
• Generellem Bedarf an Antioxidantien

Erhältlich als Mind Master Red (fruchtig) und Mind Master Green (herb).""",
        "key_benefits": [
            "Gegen oxidativen Stress",
            "Unterstützt geistige Leistungsfähigkeit",
            "Aloe Vera + Pflanzenextrakte",
            "Für stressige Phasen"
        ],
        "how_to_use": "Täglich 30ml",
        "price_hint": "Ab ca. 40€/Flasche",
        "how_to_explain": "Mind Master ist wie ein Schutzschild gegen den Alltagsstress – von innen heraus.",
        "common_objections": ["Brauche ich das wirklich?", "Was bringt das konkret?"],
        "sort_order": 4
    },
]


LR_GUARDRAILS: List[Dict[str, Any]] = [
    {
        "rule_name": "no_healing_claims",
        "rule_description": "Keine Heilversprechen für Aloe Vera oder andere Produkte",
        "severity": "block",
        "trigger_patterns": [
            r"\bheilt\b", r"\bkuriert\b", r"Krankheit.*behandeln",
            r"Aloe.*heilt", r"gegen.*Krebs", r"gegen.*Diabetes",
        ],
        "replacement_suggestion": "Formuliere um: 'unterstützt', 'pflegt', 'kann beitragen zu'",
        "example_bad": "Aloe Vera heilt Hautkrebs und Diabetes.",
        "example_good": "Aloe Vera pflegt die Haut und kann die natürliche Regeneration unterstützen.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "HCVO, HWG §3"
    },
    {
        "rule_name": "no_income_guarantees",
        "rule_description": "Keine garantierten Einkommensversprechen",
        "severity": "block",
        "trigger_patterns": [
            r"garantiert.*verdienen", r"sicher.*Einkommen",
            r"schnell.*reich", r"\d+€.*Monat.*garantiert",
        ],
        "replacement_suggestion": "Betone individuelle Faktoren",
        "example_bad": "Mit LR verdienst du garantiert 2.000€ im Monat!",
        "example_good": "Dein Einkommen bei LR hängt von deinem Einsatz und deinen Fähigkeiten ab.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "UWG §5"
    },
    {
        "rule_name": "parfum_comparison_accuracy",
        "rule_description": "Keine direkten Markenvergleiche ('wie Chanel')",
        "severity": "warn",
        "trigger_patterns": [
            r"wie.*Chanel", r"identisch.*mit.*Dior",
            r"kopie.*von", r"gleich.*wie.*\w+\s+No\.\s*\d",
        ],
        "replacement_suggestion": "Formuliere neutral: 'Premium-Qualität aus Grasse', nicht 'wie Marke X'",
        "example_bad": "Unser Parfüm ist identisch mit Chanel No. 5!",
        "example_good": "Unsere Parfüms werden in Grasse hergestellt – von denselben Parfümeuren, die auch für große Marken arbeiten.",
        "applies_to": ["messages", "posts"],
        "legal_reference": "UWG §6"
    },
    {
        "rule_name": "aloe_percentage_accuracy",
        "rule_description": "Korrekte Angabe der Aloe-Vera-Konzentration",
        "severity": "warn",
        "trigger_patterns": [
            r"100%.*Aloe", r"reines.*Aloe.*ohne.*Zusätze",
        ],
        "replacement_suggestion": "Gib die tatsächliche Konzentration an (z.B. 98%, 83%)",
        "example_bad": "100% pure Aloe Vera ohne jegliche Zusätze!",
        "example_good": "98% pures Aloe Vera Gel – schonend verarbeitet.",
        "applies_to": ["messages", "posts"],
        "legal_reference": "LMIV"
    },
]


LR_MODE_PROMPT = """
[LR HEALTH & BEAUTY MODE – COMPLIANCE & TONE]

Du kommunizierst im Kontext von LR Health & Beauty – einem deutschen Direktvertriebsunternehmen
für Aloe Vera Produkte, Parfüm und Kosmetik.

═══════════════════════════════════════════════════════════════════════════════
COMPLIANCE REGELN
═══════════════════════════════════════════════════════════════════════════════

1. KEINE HEILVERSPRECHEN
   ❌ "Aloe Vera heilt Hautkrebs"
   ❌ "Hilft gegen Diabetes"
   
   ✅ "Pflegt und unterstützt die natürliche Regeneration"
   ✅ "Kann zur normalen Hautfunktion beitragen"

2. KEINE DIREKTEN MARKENVERGLEICHE bei Parfüm
   ❌ "Unser Parfüm ist wie Chanel No. 5"
   ❌ "Identisch mit Dior Sauvage"
   
   ✅ "Premium-Qualität aus Grasse, Frankreich"
   ✅ "Von denselben Parfümeuren wie große Marken"

3. KORREKTE KONZENTRATIONS-ANGABEN
   ❌ "100% pure Aloe Vera"
   
   ✅ "98% Aloe Vera Gel" (Drinking Gel)
   ✅ "83% Aloe Vera" (Emergency Spray)

═══════════════════════════════════════════════════════════════════════════════
TON & STIL
═══════════════════════════════════════════════════════════════════════════════

• Deutsch-bodenständig, nicht übertrieben
• Qualitätsbewusst, aber fair im Preis
• Familienunternehmen-Charakter (seit 1985)
• "Made in Germany" als Qualitätsmerkmal

═══════════════════════════════════════════════════════════════════════════════
KERNBOTSCHAFTEN
═══════════════════════════════════════════════════════════════════════════════

• Aloe Vera: Eigene Plantagen, schonende Verarbeitung, hohe Konzentration
• Parfüm: Grasse-Qualität zum fairen Preis
• Unternehmen: Deutsch, familiengeführt, fast 40 Jahre Erfahrung
• Business: BDD-Mitglied, seriöses Network Marketing
"""


def get_lr_health_seed_data() -> Dict[str, Any]:
    return {
        "company": LR_COMPANY,
        "stories": LR_STORIES,
        "products": LR_PRODUCTS,
        "guardrails": LR_GUARDRAILS,
        "chief_prompt": LR_MODE_PROMPT,
    }

