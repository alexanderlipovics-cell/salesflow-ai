"""
doTERRA Seed Data
Ätherische Öle und Wellness-Produkte
"""

from typing import Dict, Any, List


DOTERRA_COMPANY: Dict[str, Any] = {
    "name": "doTERRA",
    "slug": "doterra",
    "vertical": "network_marketing",
    "description": "Weltweit führender Anbieter von ätherischen Ölen in therapeutischer Qualität",
    "website": "https://www.doterra.com",
    "compliance_level": "strict",
    "brand_config": {
        "primary_color": "#5B7F95",
        "secondary_color": "#A4C2A5",
        "country": "US",
        "founded_year": 2008,
        "headquarters": "Pleasant Grove, Utah, USA",
        "business_model": "network_marketing",
        "product_focus": ["essential_oils", "wellness", "personal_care"],
        "key_differentiator": "cptg_quality",
        "tagline": "The Essential Oil Company",
    }
}


DOTERRA_STORIES: List[Dict[str, Any]] = [
    {
        "story_type": "elevator_pitch",
        "audience": "consumer",
        "title": "doTERRA in 30 Sekunden",
        "content_30s": """doTERRA ist der weltweit größte Anbieter von ätherischen Ölen – und das aus gutem Grund.

Der Unterschied heißt CPTG: Certified Pure Tested Grade. Jede Flasche wird mehrfach getestet – auf Reinheit, auf Wirksamkeit, auf Sicherheit. Keine Füllstoffe, keine Verfälschungen.

Die Öle kommen von dort, wo die Pflanzen am besten wachsen: Lavendel aus Frankreich, Pfefferminze aus den USA, Weihrauch aus Oman. Direkt von den Bauern, fair bezahlt.

Ob für Aromatherapie, Hautpflege oder tägliche Wellness – doTERRA liefert Qualität, der du vertrauen kannst.

Reine Natur. Echte Wirkung.""",
        "use_case": "Erstkontakt, wenn jemand fragt 'Was ist doTERRA?'",
        "tags": ["intro", "overview", "cptg", "quality"],
    },
    {
        "story_type": "short_story",
        "audience": "consumer",
        "title": "Warum doTERRA-Öle anders sind",
        "content_2min": """Ätherische Öle gibt's überall. Im Bioladen, auf Amazon, in der Drogerie. Was macht doTERRA anders?

Die Antwort liegt in vier Buchstaben: CPTG – Certified Pure Tested Grade.

Das bedeutet:
1. Keine synthetischen Zusätze
2. Keine Füllstoffe oder Verdünnungen
3. Keine Pestizidrückstände
4. Echte therapeutische Wirksamkeit

Aber nicht nur das: doTERRA geht an die Quelle. Lavendel aus der Provence, Pfefferminze aus Oregon, Weihrauch aus Oman. Dort, wo die Pflanzen seit Jahrhunderten perfekt gedeihen.

Und dann das Co-Impact Sourcing: Die Bauern werden fair bezahlt, die Gemeinden unterstützt. Das ist nicht nur gut fürs Gewissen – es garantiert auch, dass die Qualität stimmt. Denn zufriedene Bauern liefern die besten Rohstoffe.

Wenn du ein doTERRA-Öl öffnest, riechst du den Unterschied. Und wenn du es anwendest, spürst du ihn.""",
        "use_case": "Wenn jemand nach dem Qualitätsunterschied fragt",
        "tags": ["quality", "cptg", "sourcing", "differentiation"],
    },
    {
        "story_type": "why_story",
        "audience": "business_partner",
        "title": "Warum doTERRA als Business?",
        "content_2min": """doTERRA ist mehr als ein MLM – es ist eine Bewegung.

Hier ist, warum das Business funktioniert:

Erstens: Die Produkte. Ätherische Öle sind kein Trend, der wieder verschwindet. Menschen nutzen sie seit Jahrtausenden. Und wenn sie einmal die Qualität von doTERRA erlebt haben, wollen sie nichts anderes mehr.

Zweitens: Die Wiederkaufrate. Öle werden aufgebraucht. Kunden bestellen nach – Monat für Monat. Das bedeutet: wiederkehrende Einnahmen.

Drittens: Die Community. doTERRA hat eine unglaublich supportive Kultur. Hier geht es nicht nur um Verkaufen, sondern um Teilen von Wissen, gegenseitige Unterstützung, echte Beziehungen.

Viertens: Die Mission. Co-Impact Sourcing verändert Leben in Entwicklungsländern. Du verkaufst nicht nur Öle – du bist Teil von etwas Größerem.

Das Beste: Du kannst klein anfangen. Mit deinem eigenen Ölpaket, deinen eigenen Erfahrungen. Und von dort aus wachsen.""",
        "use_case": "Wenn jemand über das doTERRA Business nachdenkt",
        "tags": ["business", "opportunity", "community", "mission"],
    },
    {
        "story_type": "objection_story",
        "audience": "skeptic",
        "title": "Einwand: 'Ätherische Öle sind doch Hokuspokus'",
        "content_1min": """Verstehe ich. Es gibt viel Unsinn im Wellness-Bereich. Aber lass mich dir was zeigen.

Ätherische Öle sind keine Erfindung der New-Age-Bewegung. Sie werden seit Jahrtausenden verwendet – in der traditionellen Medizin, in der Aromatherapie, sogar in modernen Krankenhäusern.

Die Wirkung? Wissenschaftlich belegt. Lavendelöl fördert Entspannung – das zeigen Studien. Pfefferminzöl hilft bei Kopfspannung. Teebaumöl ist antimikrobiell.

Der Hokuspokus entsteht, wenn Leute übertreiben. Wenn sie behaupten, Öle können Krebs heilen oder Medikamente ersetzen. Das macht doTERRA nicht.

Was doTERRA macht: Reinste Qualität liefern. Wissen teilen. Und Menschen natürliche Alternativen für den Alltag geben – für besseren Schlaf, mehr Energie, weniger Stress.

Probier es einfach aus. Ein Tropfen Pfefferminze auf die Schläfen bei Kopfspannung. Dann reden wir weiter.""",
        "use_case": "Wenn jemand ätherische Öle für Esoterik hält",
        "tags": ["objection", "skeptic", "science", "credibility"],
    },
    {
        "story_type": "objection_story",
        "audience": "consumer",
        "title": "Einwand: 'Die sind so teuer'",
        "content_1min": """Ja, doTERRA-Öle kosten mehr als die 5€-Fläschchen im Drogeriemarkt. Lass mich erklären, warum.

Diese billigen Öle sind oft verdünnt oder sogar synthetisch. Du bekommst vielleicht "Lavendelöl" – aber 80% davon sind Trägeröl oder synthetische Duftstoffe.

Bei doTERRA bekommst du 100% reines Öl. Ein Tropfen echtes Pfefferminzöl entspricht 28 Tassen Pfefferminztee. Ein Tropfen!

Rechne mal: Eine Flasche Pfefferminze hat etwa 250 Tropfen. Bei täglicher Anwendung hält die Monate. Pro Tag: wenige Cent.

Plus: Bei doTERRA kannst du am Treueprogram teilnehmen. Da bekommst du Punkte zurück, kostenlose Produkte, Rabatte.

Es geht nicht um billig – es geht um Wert. Und bei doTERRA bekommst du den.""",
        "use_case": "Wenn jemand den Preis als Einwand nennt",
        "tags": ["objection", "price", "value", "comparison"],
    },
]


DOTERRA_PRODUCTS: List[Dict[str, Any]] = [
    {
        "name": "Lavendel (Lavandula angustifolia)",
        "slug": "lavender",
        "category": "single_oils",
        "tagline": "Der Alleskönner unter den Ölen",
        "description_short": "Das vielseitigste ätherische Öl – für Entspannung, Hautpflege und ruhigen Schlaf.",
        "description_full": """Lavendel ist das meistverkaufte und vielseitigste Öl von doTERRA.

Anwendungen:
• Aromatherapie: Im Diffuser für entspannte Atmosphäre
• Schlaf: Ein Tropfen aufs Kopfkissen für ruhigere Nächte
• Hautpflege: Bei kleinen Hautirritationen (verdünnt anwenden)
• Entspannung: In der Badewanne oder für eine Massage

Das doTERRA Lavendelöl stammt aus Bulgarien und Frankreich – den besten Anbaugebieten der Welt. CPTG-zertifiziert.""",
        "key_benefits": [
            "Fördert Entspannung",
            "Unterstützt ruhigen Schlaf",
            "Beruhigt die Haut",
            "Vielseitig einsetzbar"
        ],
        "how_to_use": "Aromatisch (Diffuser), topisch (auf die Haut, verdünnt), oder intern (1 Tropfen in Wasser)",
        "price_hint": "Ab ca. 30€ (15ml)",
        "how_to_explain": "Lavendel ist wie ein Schweizer Taschenmesser – es gibt fast nichts, wofür du es nicht nutzen kannst.",
        "common_objections": ["Ich mag den Geruch nicht", "Kann ich nicht einfach Lavendelkissen kaufen?"],
        "sort_order": 1
    },
    {
        "name": "Pfefferminze (Mentha piperita)",
        "slug": "peppermint",
        "category": "single_oils",
        "tagline": "Der Energiebooster",
        "description_short": "Erfrischend, belebend, vielseitig – für Energie und klaren Kopf.",
        "description_full": """Pfefferminzöl ist bekannt für seine erfrischende, belebende Wirkung.

Anwendungen:
• Energie: Ein Tropfen in die Handflächen, einatmen – sofort wacher
• Kopf: Bei Spannungen auf Schläfen und Nacken (verdünnt)
• Verdauung: 1 Tropfen in Wasser nach schwerem Essen
• Sport: In einer kühlenden Massage nach dem Training

Das doTERRA Pfefferminzöl kommt aus den USA – höchste Menthol-Konzentration. Ein Tropfen = 28 Tassen Pfefferminztee.""",
        "key_benefits": [
            "Steigert Energie und Wachheit",
            "Erfrischt bei geistiger Müdigkeit",
            "Unterstützt die Verdauung",
            "Kühlt bei körperlicher Anstrengung"
        ],
        "how_to_use": "Aromatisch, topisch (Schläfen, Nacken – verdünnt), intern (1 Tropfen in Wasser)",
        "price_hint": "Ab ca. 28€ (15ml)",
        "how_to_explain": "Ein Tropfen Pfefferminze ist wie eine Tasse starker Kaffee – nur natürlich und ohne Crash.",
        "common_objections": ["Ist das nicht zu stark?"],
        "sort_order": 2
    },
    {
        "name": "On Guard® (Schützende Mischung)",
        "slug": "on_guard",
        "category": "blends",
        "tagline": "Dein natürlicher Schutzschild",
        "description_short": "Die immunstärkende Mischung mit Wild Orange, Nelke, Zimt, Eukalyptus und Rosmarin.",
        "description_full": """On Guard ist doTERRAs beliebteste Mischung – entwickelt zum Schutz und zur Stärkung.

Die Mischung enthält:
• Wild Orange – erhebend, reinigend
• Nelke – starke antioxidative Eigenschaften
• Zimt – wärmend, schützend
• Eukalyptus – klärend für die Atemwege
• Rosmarin – belebend, unterstützend

Anwendungen:
• Im Diffuser während der Erkältungszeit
• Als Handseife (On Guard Seife)
• 1-2 Tropfen in Wasser als tägliche Unterstützung
• Zum Reinigen von Oberflächen""",
        "key_benefits": [
            "Unterstützt das Immunsystem",
            "Reinigt die Luft",
            "Natürliche Alternative zu chemischen Reinigern",
            "Riecht warm und einladend"
        ],
        "how_to_use": "Im Diffuser, topisch (Fußsohlen), intern (1-2 Tropfen in Wasser)",
        "price_hint": "Ab ca. 45€ (15ml)",
        "how_to_explain": "On Guard ist wie ein natürlicher Schutzschild – besonders in der Erkältungszeit unverzichtbar.",
        "common_objections": ["Kann das wirklich das Immunsystem stärken?"],
        "sort_order": 3
    },
    {
        "name": "Home Essentials Kit",
        "slug": "home_essentials_kit",
        "category": "kits",
        "tagline": "Der perfekte Einstieg",
        "description_short": "10 wichtigste Öle + Diffuser – alles was du brauchst, um zu starten.",
        "description_full": """Das Home Essentials Kit ist der beliebteste Einstieg in die Welt von doTERRA.

Enthalten sind:
• Lavendel – Entspannung, Schlaf, Hautpflege
• Pfefferminze – Energie, klarer Kopf
• Zitrone – Reinigung, Stimmung heben
• Teebaum (Melaleuca) – Hautpflege, Reinigung
• Oregano – starke Unterstützung
• Weihrauch – emotionale Balance, Hautpflege
• On Guard – Immununterstützung
• DigestZen – Verdauungsunterstützung
• Breathe – Atemwege
• Deep Blue – nach körperlicher Anstrengung

Plus: Ein hochwertiger Ultraschall-Diffuser

Das Kit deckt 95% aller Alltags-Anwendungen ab.""",
        "key_benefits": [
            "Alles für den Einstieg",
            "Bestes Preis-Leistungs-Verhältnis",
            "Diffuser inklusive",
            "Deckt alle wichtigen Anwendungen ab"
        ],
        "price_hint": "Ab ca. 275€ (statt Einzelpreis ~400€)",
        "how_to_explain": "Das Kit ist wie eine komplette Hausapotheke in natürlich – und du sparst über 30% gegenüber Einzelkauf.",
        "common_objections": ["Das ist mir zu viel auf einmal", "Brauche ich wirklich alle Öle?"],
        "sort_order": 4
    },
]


DOTERRA_GUARDRAILS: List[Dict[str, Any]] = [
    {
        "rule_name": "no_medical_claims",
        "rule_description": "Keine medizinischen Heilversprechen für ätherische Öle",
        "severity": "block",
        "trigger_patterns": [
            r"\bheilt\b", r"\bkuriert\b", r"behandelt.*Krankheit",
            r"ersetzt.*Medikament", r"gegen.*Krebs", r"gegen.*Diabetes",
            r"ärztliche.*Behandlung.*nicht.*nötig",
        ],
        "replacement_suggestion": "Formuliere um: 'unterstützt', 'kann beitragen zu', 'traditionell verwendet für'",
        "example_bad": "Weihrauchöl heilt Krebs und ersetzt eine Chemotherapie.",
        "example_good": "Weihrauch wird traditionell zur Unterstützung des allgemeinen Wohlbefindens verwendet.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "FDA Guidelines, HWG"
    },
    {
        "rule_name": "no_income_guarantees",
        "rule_description": "Keine garantierten Einkommensversprechen",
        "severity": "block",
        "trigger_patterns": [
            r"garantiert.*verdienen", r"sicher.*Einkommen",
            r"schnell.*reich", r"\d+\$.*Monat.*garantiert",
        ],
        "replacement_suggestion": "Betone individuelle Faktoren und dass Ergebnisse variieren",
        "example_bad": "Mit doTERRA verdienst du garantiert $5.000 im Monat!",
        "example_good": "Dein Erfolg bei doTERRA hängt von deinem Einsatz, deinen Fähigkeiten und vielen anderen Faktoren ab. Ergebnisse variieren.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "FTC Guidelines"
    },
    {
        "rule_name": "internal_use_disclaimer",
        "rule_description": "Hinweis bei interner Anwendung",
        "severity": "warn",
        "trigger_patterns": [
            r"Tropfen.*trinken", r"Tropfen.*Wasser.*trinken",
            r"intern.*anwenden", r"einnehmen",
        ],
        "replacement_suggestion": "Füge Hinweis hinzu: 'Nur bei als Nahrungsergänzungsmittel gekennzeichneten Ölen'",
        "example_bad": "Gib 2 Tropfen in dein Wasser und trink es!",
        "example_good": "Einige Öle sind zur internen Anwendung geeignet – achte auf das Nahrungsergänzungsmittel-Label. Bei Unsicherheit frage einen Arzt.",
        "applies_to": ["messages", "posts"],
        "legal_reference": "LMIV"
    },
    {
        "rule_name": "skin_application_disclaimer",
        "rule_description": "Hinweis auf Verdünnung bei Hautanwendung",
        "severity": "suggest",
        "trigger_patterns": [
            r"auf.*Haut.*auftragen", r"topisch.*anwenden",
            r"auf.*Schläfen", r"einmassieren",
        ],
        "replacement_suggestion": "Füge Verdünnungshinweis hinzu: 'Mit Trägeröl verdünnen', 'Hauttest empfohlen'",
        "example_bad": "Trag das Öl pur auf deine Haut auf!",
        "example_good": "Verdünne das Öl mit einem Trägeröl (z.B. Kokosöl) bevor du es auf die Haut aufträgst. Mache vorher einen Hauttest.",
        "applies_to": ["messages", "posts"],
        "legal_reference": "Best Practice"
    },
]


DOTERRA_MODE_PROMPT = """
[DOTERRA MODE – COMPLIANCE & TONE]

Du kommunizierst im Kontext von doTERRA – dem weltweit führenden Anbieter
von ätherischen Ölen in CPTG-Qualität (Certified Pure Tested Grade).

═══════════════════════════════════════════════════════════════════════════════
COMPLIANCE REGELN (STRIKTE EINHALTUNG)
═══════════════════════════════════════════════════════════════════════════════

1. KEINE MEDIZINISCHEN HEILVERSPRECHEN
   ❌ "Weihrauch heilt Krebs"
   ❌ "Ersetzt deine Medikamente"
   ❌ "Keine Nebenwirkungen"
   
   ✅ "Traditionell verwendet für..."
   ✅ "Kann zur Unterstützung des Wohlbefindens beitragen"
   ✅ "Viele Menschen berichten von..."

2. BEI INTERNER ANWENDUNG
   ❌ "Gib einfach Öl in dein Wasser"
   
   ✅ "Einige Öle sind als Nahrungsergänzungsmittel gekennzeichnet"
   ✅ "Achte auf das NEM-Label"
   ✅ "Bei Unsicherheit Arzt fragen"

3. BEI HAUTANWENDUNG
   ❌ "Trag es pur auf"
   
   ✅ "Mit Trägeröl verdünnen"
   ✅ "Hauttest empfohlen"
   ✅ "Bei empfindlicher Haut vorsichtig sein"

4. KEINE EINKOMMENSGARANTIEN
   ❌ "Du wirst reich"
   
   ✅ "Ergebnisse variieren"
   ✅ "Hängt von deinem Einsatz ab"

═══════════════════════════════════════════════════════════════════════════════
TON & STIL
═══════════════════════════════════════════════════════════════════════════════

• Naturverbunden, authentisch, warmherzig
• Wissenschaftlich fundiert, aber nicht belehrend
• Community-orientiert ("Wellness Advocates")
• Mission-driven (Co-Impact Sourcing)

═══════════════════════════════════════════════════════════════════════════════
KERNBOTSCHAFTEN
═══════════════════════════════════════════════════════════════════════════════

• CPTG: Reinste Qualität, mehrfach getestet
• Sourcing: Von dort, wo die Pflanzen am besten wachsen
• Co-Impact: Faire Bezahlung, Unterstützung der Gemeinden
• Vielseitigkeit: Aromatherapie, Hautpflege, Haushaltsreinigung
• Natürliche Alternative: Ergänzung (nicht Ersatz) zu moderner Medizin
"""


def get_doterra_seed_data() -> Dict[str, Any]:
    return {
        "company": DOTERRA_COMPANY,
        "stories": DOTERRA_STORIES,
        "products": DOTERRA_PRODUCTS,
        "guardrails": DOTERRA_GUARDRAILS,
        "chief_prompt": DOTERRA_MODE_PROMPT,
    }
