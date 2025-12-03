"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ZINZINO SEED DATA v2.0                                                    ║
║  Vollständiges Company-Profil für Sales Flow AI                            ║
║  Überarbeitet: Klarer, compliant, professionell                            ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Dict, Any, List


# =============================================================================
# COMPANY CONFIG
# =============================================================================

ZINZINO_COMPANY: Dict[str, Any] = {
    "name": "Zinzino",
    "slug": "zinzino",
    "vertical": "network_marketing",
    "description": "Skandinavisches Health-Tech-Unternehmen für testbasierte, personalisierte Ernährung",
    "website": "https://www.zinzino.com",
    "compliance_level": "strict",
    "brand_config": {
        "primary_color": "#1E3A5F",
        "secondary_color": "#E8B923",
        "country": "SE",
        "founded_year": 2005,
        "headquarters": "Göteborg, Schweden",
        "business_model": "network_marketing",
        "product_focus": ["omega3", "gut_health", "immunity", "skin_care"],
        "key_differentiator": "test_based_personalization",
        "tagline": "Von Raten zu Wissen",
        "stock_exchange": "Nasdaq First North",
    }
}


# =============================================================================
# STORIES (Elevator Pitches, Kundengeschichten, Therapeuten-Version)
# =============================================================================

ZINZINO_STORIES: List[Dict[str, Any]] = [
    # -------------------------------------------------------------------------
    # ELEVATOR PITCH (30 Sekunden)
    # -------------------------------------------------------------------------
    {
        "story_type": "elevator_pitch",
        "audience": "consumer",
        "title": "Zinzino in 30 Sekunden",
        "content_30s": """Zinzino ist ein skandinavisches Health-Tech-Unternehmen, das Ernährung messbar macht.

Statt zu raten, was dein Körper braucht, startest du mit einem einfachen Bluttest. Der zeigt dir deine Omega-6:3-Balance – ein Marker, der eng mit Entzündungsgeschehen und Zellgesundheit zusammenhängt.

Basierend auf deinem Ergebnis bekommst du ein klares Protokoll: hochwertige Omega-3-Öle, nach einigen Monaten ein Retest. So siehst du schwarz auf weiß, was sich verändert hat.

Kein Raten. Messbare Ergebnisse.""",
        "use_case": "Erstkontakt, wenn jemand fragt 'Was ist Zinzino?'",
        "channel_hints": ["instagram", "whatsapp", "linkedin", "networking"],
        "tags": ["intro", "overview", "test_based", "30_seconds"],
    },
    
    # -------------------------------------------------------------------------
    # 2-MINUTEN STORY (für Interessenten/Kunden)
    # -------------------------------------------------------------------------
    {
        "story_type": "short_story",
        "audience": "consumer",
        "title": "Die Zinzino-Geschichte (2 Minuten)",
        "content_2min": """Stell dir vor, du könntest sehen, was in deinem Körper wirklich passiert – nicht raten, sondern wissen.

Genau das macht Zinzino seit fast 20 Jahren. Die Gründer haben eine einfache Frage gestellt: Warum nehmen Millionen Menschen Nahrungsergänzung, ohne zu wissen, ob sie überhaupt etwas bringt?

Ihre Antwort: Ein Bluttest. Ein kleiner Piks in den Finger, ein paar Tropfen auf eine Testkarte – und du weißt, wie es um deine Fettsäuren steht. Besonders wichtig: das Verhältnis von Omega-6 zu Omega-3.

Warum ist das relevant? Omega-6 haben wir durch moderne Ernährung oft im Überfluss – das kann Entzündungsprozesse fördern. Omega-3 wirkt dem entgegen, aber die meisten Menschen haben viel zu wenig davon.

Dein Testergebnis zeigt genau, wo du stehst. Dann kommt das Protokoll: hochwertiges BalanceOil – eine Kombination aus Fischöl und Olivenöl mit Polyphenolen.

Nach 4-6 Monaten machst du einen Retest. Und hier passiert etwas, das die meisten Supplement-Firmen nicht bieten können: Du SIEHST die Veränderung. Zahlen, die sich bewegen.

Das ist Zinzino: Nicht einfach Pillen schlucken und hoffen. Sondern messen, optimieren, beweisen.""",
        "use_case": "Ausführlichere Erklärung bei echtem Interesse",
        "channel_hints": ["call", "video", "presentation", "zoom"],
        "tags": ["story", "why_zinzino", "test_based", "customer_journey"],
    },
    
    # -------------------------------------------------------------------------
    # 1-MINUTEN STORY FÜR THERAPEUTEN/ÄRZTE
    # -------------------------------------------------------------------------
    {
        "story_type": "short_story",
        "audience": "health_professional",
        "title": "Zinzino für Fachpersonal (1 Minute)",
        "content_1min": """Zinzino positioniert sich als Anbieter testbasierter Nahrungsergänzung mit Schwerpunkt auf Fettsäureprofilen.

Das System basiert auf Dried Blood Spot Tests (DBS), die im akkreditierten Labor analysiert werden. Erfasst werden 11 Fettsäuren, das Omega-6:3-Verhältnis sowie weitere Marker wie der Omega-3-Index und der Schutzindex.

Auf Basis dieser Werte werden Dosierungsempfehlungen für hochdosierte Omega-3-Präparate gegeben. Ziel ist die Optimierung des Verhältnisses in einen definierten Zielbereich, der in Studien mit kardiovaskulären und anti-inflammatorischen Effekten assoziiert wird.

Wichtig für Ihre Praxis: Zinzino ersetzt keine Diagnose oder Therapie. Es liefert standardisierte Datenpunkte und ein strukturiertes Supplementationskonzept, das Sie in Ihre ganzheitliche Betreuung integrieren können.

Die Retests nach definiertem Zeitraum ermöglichen eine objektive Verlaufskontrolle – unabhängig von subjektivem Befinden.""",
        "use_case": "Gespräch mit Ärzten, Heilpraktikern, Therapeuten",
        "channel_hints": ["email", "call", "in_person", "fachveranstaltung"],
        "tags": ["professional", "medical", "science", "compliance", "b2b"],
    },
    
    # -------------------------------------------------------------------------
    # BUSINESS-PARTNER STORY
    # -------------------------------------------------------------------------
    {
        "story_type": "why_story",
        "audience": "business_partner",
        "title": "Warum Zinzino als Business?",
        "content_2min": """Du überlegst, ob Network Marketing etwas für dich ist? Lass mich dir erzählen, warum Zinzino anders ist.

Die meisten MLM-Firmen verkaufen austauschbare Produkte. Zinzino hat etwas, das fast niemand hat: einen Bluttest. Das bedeutet: Deine Kunden SEHEN, dass es funktioniert. Kein "ich fühle mich irgendwie besser" – sondern Zahlen, die sich verbessern.

Das macht den Unterschied:
• Kundenbindung: Wer seine Verbesserung sieht, bleibt dabei
• Glaubwürdigkeit: Du verkaufst keine Wunder, du verkaufst messbare Ergebnisse
• Wiederkehrende Einnahmen: Abo-Modell mit hoher Retention

Dazu kommt: Zinzino ist skandinavisch – seriös, qualitätsbewusst, keine aggressive Verkaufskultur. Das zieht die richtigen Leute an.

Und das Wichtigste: Du kannst mit gutem Gewissen dahinterstehen. Weil du weißt, dass es funktioniert – weil du es selbst gemessen hast.

Natürlich: Dein Erfolg hängt von deinem Einsatz ab. Keine Garantien. Aber ein System, das funktioniert.""",
        "use_case": "Wenn jemand über Business-Möglichkeit nachdenkt",
        "channel_hints": ["call", "zoom", "coffee", "1on1"],
        "tags": ["business", "opportunity", "retention", "credibility"],
    },
    
    # -------------------------------------------------------------------------
    # EINWAND: "Gibt's doch überall" / "Ist das nicht wie alle anderen?"
    # -------------------------------------------------------------------------
    {
        "story_type": "objection_story",
        "audience": "skeptic",
        "title": "Einwand: 'Omega-3 gibt's doch überall'",
        "content_1min": """Verstehe ich total. Omega-3 gibt's an jeder Ecke. Was macht Zinzino anders?

Drei Dinge:

Erstens: Der Test. Bevor du irgendetwas nimmst, weißt du, wo du stehst. Deine persönliche Omega-6:3-Balance. Das hat sonst fast niemand.

Zweitens: Die Qualität. Das BalanceOil ist eine Mischung aus Fischöl und extra-nativem Olivenöl mit Polyphenolen. Die meisten Omega-3-Produkte im Supermarkt sind dagegen billiges Industrieöl.

Drittens: Der Retest. Nach ein paar Monaten testest du nochmal. Du SIEHST, was sich verändert hat. Kein "ich glaube, es hilft" – sondern Zahlen.

Das Ergebnis: 95% der Menschen, die das Protokoll befolgen, verbessern ihre Werte signifikant. Das sind echte Daten aus über einer Million Tests.""",
        "use_case": "Wenn jemand skeptisch ist wegen 'noch ein Omega-3'",
        "channel_hints": ["chat", "call", "dm"],
        "tags": ["objection", "differentiation", "skeptic", "quality", "proof"],
    },
    
    # -------------------------------------------------------------------------
    # EINWAND: "Das ist doch MLM"
    # -------------------------------------------------------------------------
    {
        "story_type": "objection_story",
        "audience": "skeptic",
        "title": "Einwand: 'Ist das MLM?'",
        "content_1min": """Ja, Zinzino nutzt Network Marketing. Und ich verstehe deine Skepsis – es gibt viele schwarze Schafe.

Aber hier ist der Unterschied:

Bei den meisten MLMs geht es darum, möglichst viele Leute anzuwerben. Bei Zinzino geht es darum, dass Kunden bleiben – weil sie ihre Verbesserung im Retest sehen. Das verändert alles.

Ein paar Fakten:
• Zinzino ist börsennotiert (Nasdaq First North) – also transparent
• Der Fokus liegt auf Produktverkauf, nicht auf Rekrutierung
• Die Retention ist hoch, weil das System funktioniert

Ich verstehe, wenn du skeptisch bist. Aber schau dir die Produkte und das Testsystem an. Probier es selbst. Dann reden wir weiter.""",
        "use_case": "Wenn jemand MLM-Skepsis hat",
        "channel_hints": ["chat", "call"],
        "tags": ["objection", "mlm", "skeptic", "transparency"],
    },
]


# =============================================================================
# KNOWLEDGE ITEMS (Company Info, Produkte, Konzepte)
# =============================================================================

ZINZINO_KNOWLEDGE: List[Dict[str, Any]] = [
    # -------------------------------------------------------------------------
    # COMPANY OVERVIEW
    # -------------------------------------------------------------------------
    {
        "type": "company_overview",
        "domain": "company",
        "topic": "company_overview",
        "title": "Zinzino – Unternehmensprofil",
        "content": """Zinzino ist ein börsennotiertes skandinavisches Health-Tech-Unternehmen (gegründet 2005, Hauptsitz Göteborg, Schweden), das testbasierte, personalisierte Ernährung anbietet.

GESCHÄFTSMODELL:
• Kombination aus Labordiagnostik (Fettsäureprofile via DBS) und darauf abgestimmten Nahrungsergänzungsmitteln
• Abo-basiertes Kundenmodell mit hoher Retention
• Vertrieb über selbstständige Partner (Network Marketing)

DIFFERENZIERUNG:
• Einziger großer Supplement-Anbieter mit integriertem Test-Retest-System
• Fokus auf messbare Ergebnisse statt vage Versprechen
• Wissenschaftlich fundiert, aber verständlich kommuniziert

KENNZAHLEN:
• Aktiv in 100+ Märkten weltweit
• Über 1 Million durchgeführte Bluttests
• 95% Verbesserungsrate bei korrekter Anwendung
• Börsennotiert: Nasdaq First North""",
        "content_short": "Skandinavisches Health-Tech für testbasierte Ernährung. Test-Produkt-Retest.",
        "keywords": ["zinzino", "health-tech", "skandinavien", "börsennotiert", "test-basiert"],
    },
    
    # -------------------------------------------------------------------------
    # VISION & MISSION
    # -------------------------------------------------------------------------
    {
        "type": "company_overview",
        "domain": "company",
        "topic": "mission_vision",
        "title": "Zinzino – Vision & Mission",
        "content": """VISION:
Eine Welt, in der Menschen ihre Gesundheitsentscheidungen auf Basis von Daten treffen – nicht auf Basis von Vermutungen oder Marketing.

MISSION:
Menschen dabei unterstützen, von "Ich glaube, das hilft" zu "Ich weiß, dass es wirkt" zu kommen – durch:
1. Messbare Ausgangswerte (Test)
2. Wissenschaftlich fundierte Produkte (Protokoll)
3. Dokumentierte Fortschritte (Retest)

KERNWERTE:
• Transparenz: Zeigen, was im Körper passiert
• Wissenschaft: Faktenbasiert, nicht esoterik-getrieben
• Langfristigkeit: Gesundheit als Marathon, nicht als Sprint
• Empowerment: Menschen befähigen, informierte Entscheidungen zu treffen

CLAIM: "Von Raten zu Wissen" """,
        "content_short": "Von Raten zu Wissen – messbare Gesundheit durch Test-Produkt-Retest.",
        "keywords": ["vision", "mission", "von raten zu wissen", "transparenz"],
    },
    
    # -------------------------------------------------------------------------
    # BALANCE-KONZEPT & BLUTTEST
    # -------------------------------------------------------------------------
    {
        "type": "product_line",
        "domain": "company",
        "topic": "balance_concept",
        "title": "Das Balance-Konzept (Test-Produkt-Retest)",
        "content": """DER ABLAUF:

1. BALANCETEST (DBS)
   • Trockenbluttest aus dem Finger (3-4 Tropfen)
   • Analyse im Labor: 11 Fettsäuren, Omega-6:3-Ratio, Omega-3-Index
   • Ergebnis nach 10-20 Tagen digital verfügbar

2. AUSWERTUNG VERSTEHEN
   • Ampelsystem: Rot/Gelb/Grün für einzelne Marker
   • Hauptwert: Omega-6:3-Verhältnis (Ziel: unter 3:1, Start oft 10:1 bis 20:1)
   • Weitere Marker: Schutzindex, Zellfließfähigkeit, mentale Stärke

3. PROTOKOLL STARTEN
   • BalanceOil (Fischöl + Olivenöl + Polyphenole)
   • Dosierung basierend auf Testergebnis und Körpergewicht
   • Optional: ZinoBiotic (Ballaststoffe), Xtend+ (Mikronährstoffe)

4. RETEST NACH 120 TAGEN
   • Dokumentation der Veränderung
   • Anpassung des Protokolls bei Bedarf
   • Motivation durch sichtbare Fortschritte

WISSENSCHAFTLICHER HINTERGRUND:
Das Omega-6:3-Verhältnis ist ein etablierter Biomarker. Studien zeigen Zusammenhänge mit kardiovaskulärer Gesundheit, Entzündungsmarkern und Zellmembran-Funktion. Zinzino macht diese Forschung zugänglich – ohne Heilversprechen.""",
        "content_short": "Test-Produkt-Retest: Bluttest → BalanceOil → Retest nach 120 Tagen.",
        "keywords": ["balancetest", "omega-6:3", "retest", "dbs", "fettsäuren"],
    },
]


# =============================================================================
# PRODUCTS (Detaillierte Produktinformationen)
# =============================================================================

ZINZINO_PRODUCTS: List[Dict[str, Any]] = [
    {
        "name": "BalanceTest",
        "slug": "balance_test",
        "category": "tests",
        "tagline": "Wissen statt raten",
        "description_short": "Bluttest aus dem Finger – analysiert 11 Fettsäuren und deine Omega-6:3-Balance.",
        "description_full": """Der BalanceTest ist ein Trockenbluttest (Dried Blood Spot), den du einfach zuhause durchführen kannst.

ABLAUF:
Mit einem kleinen Piks in den Finger nimmst du ein paar Tropfen Blut auf eine Testkarte. Diese schickst du ins Labor, und nach 10-20 Tagen bekommst du dein persönliches Ergebnis.

GEMESSEN WERDEN:
• 11 verschiedene Fettsäuren
• Dein Omega-6:3-Verhältnis (ideal: unter 3:1)
• Dein Omega-3-Index
• Schutzindex und Zellfließfähigkeit
• Mentale Stärke-Index

Das Ergebnis zeigt dir genau, wo du stehst – und bildet die Grundlage für dein personalisiertes Protokoll.""",
        "key_benefits": [
            "Wissen statt raten – deine persönlichen Werte",
            "Einfach zuhause durchführbar",
            "Laboranalyse mit wissenschaftlichem Standard",
            "Basis für personalisierte Empfehlung"
        ],
        "science_summary": "Dried Blood Spot Test, 11 Fettsäuren, CE-zertifiziertes Labor",
        "price_hint": "Im Health Protocol enthalten, einzeln ca. 200€",
        "how_to_explain": "Erkläre den Test als 'Standortbestimmung' – wie ein Navi, das erst wissen muss wo du bist, bevor es dir den Weg zeigen kann.",
        "common_objections": ["Wozu brauche ich einen Test?", "Zu teuer", "Kann ich nicht selbst machen"],
        "sort_order": 1
    },
    {
        "name": "BalanceOil+",
        "slug": "balance_oil_plus",
        "category": "supplements",
        "tagline": "Omega-3 mit Olivenöl-Power",
        "description_short": "Hochdosiertes Omega-3 aus Wildfisch, kombiniert mit extra-nativem Olivenöl und Polyphenolen.",
        "description_full": """BalanceOil+ ist das Kernprodukt von Zinzino – eine einzigartige Kombination aus:

INHALTSSTOFFE:
• Hochwertigem Omega-3 aus wildem Fisch (EPA + DHA)
• Extra-nativem Olivenöl mit hohem Polyphenol-Gehalt
• Vitamin D3 (2000 IE pro Tagesdosis)

WARUM DIE KOMBINATION?
Die Polyphenole aus dem Olivenöl schützen die Omega-3-Fettsäuren vor Oxidation und haben selbst positive Effekte. Das unterscheidet BalanceOil+ von Standard-Fischöl-Kapseln.

GESCHMACK:
Erhältlich in Orange, Zitrone, Vanille – und auch in veganer Version mit Algenöl (BalanceOil Vegan).""",
        "key_benefits": [
            "Optimiert Omega-6:3-Verhältnis",
            "Polyphenole schützen vor Oxidation",
            "Vitamin D3 inklusive",
            "Wissenschaftlich getestete Dosierung"
        ],
        "science_summary": "2:1 Verhältnis Fischöl:Olivenöl, 15ml täglich, EPA/DHA/DPA + Polyphenole + Vitamin D3",
        "price_hint": "Ab ca. 35€/Monat im Abo",
        "how_to_explain": "Vergleiche mit Autoöl: Du kannst billiges nehmen, aber dann läuft der Motor nicht optimal. BalanceOil+ ist Premium-Kraftstoff für deine Zellen.",
        "common_objections": ["Schmeckt Fischöl nicht eklig?", "Kann ich nicht normale Kapseln nehmen?", "Zu teuer"],
        "sort_order": 2
    },
    {
        "name": "ZinoBiotic+",
        "slug": "zinobiotic",
        "category": "supplements",
        "tagline": "8 natürliche Ballaststoffe für deinen Darm",
        "description_short": "Prebiotische Ballaststoff-Mischung für eine gesunde Darmflora.",
        "description_full": """ZinoBiotic+ ist eine Mischung aus 8 natürlichen Ballaststoffen, die als Nahrung für deine guten Darmbakterien dienen.

ENTHALTEN SIND:
• Resistente Stärke (aus Mais)
• Inulin (aus Zichorie)
• Beta-Glucane (aus Hafer)
• Psyllium-Schalen
• Fructo-Oligosaccharide
• und weitere prebiotische Fasern

WARUM BALLASTSTOFFE?
Die Mischung unterstützt das Wachstum nützlicher Bakterien im Darm, was sich positiv auf Verdauung, Immunsystem und sogar Stimmung auswirken kann.

ANWENDUNG:
Einfach morgens in Wasser, Smoothie oder Müsli einrühren – geschmacksneutral.""",
        "key_benefits": [
            "8 verschiedene Ballaststoff-Quellen",
            "Fördert gesunde Darmflora",
            "Unterstützt Verdauung",
            "Geschmacksneutral"
        ],
        "price_hint": "Ab ca. 30€/Monat im Abo",
        "how_to_explain": "Dein Darm ist wie ein Garten. ZinoBiotic+ ist der Dünger, der die guten Pflanzen wachsen lässt.",
        "common_objections": ["Ich esse genug Ballaststoffe", "Macht das nicht Blähungen?"],
        "sort_order": 3
    },
    {
        "name": "Health Protocol",
        "slug": "health_protocol",
        "category": "bundles",
        "tagline": "Das komplette System",
        "description_short": "BalanceTest + BalanceOil+ + ZinoBiotic+ + Retest – alles was du brauchst.",
        "description_full": """Das Health Protocol ist das Rundum-Paket für alle, die es richtig machen wollen:

ENTHALTEN:
1. BalanceTest – deine Standortbestimmung
2. BalanceOil+ – Omega-3 Optimierung (4-6 Monate)
3. ZinoBiotic+ – Darmgesundheit parallel
4. Retest – nach 4-6 Monaten siehst du deine Fortschritte

DAS ABO-MODELL:
Sorgt dafür, dass du automatisch versorgt wirst – kein Vergessen, keine Unterbrechung.

WARUM DAS PROTOCOL?
Die meisten Kunden starten damit, weil es das beste Preis-Leistungs-Verhältnis bietet und den kompletten Test-Produkt-Retest-Zyklus abdeckt.""",
        "key_benefits": [
            "Komplettes System in einem Paket",
            "Bestes Preis-Leistungs-Verhältnis",
            "Retest inklusive",
            "Abo für kontinuierliche Versorgung"
        ],
        "price_hint": "Ab ca. 129€/Monat (inkl. Tests)",
        "how_to_explain": "Das Health Protocol ist wie ein Fitness-Abo für dein Blut – mit Vorher-Nachher-Messung inklusive.",
        "common_objections": ["Zu teuer", "Brauche ich wirklich alles?", "Kann ich auch erstmal nur testen?"],
        "sort_order": 4
    },
    {
        "name": "Xtend+",
        "slug": "xtend_plus",
        "category": "supplements",
        "tagline": "23 Vitamine & Mineralien",
        "description_short": "Umfassendes Mikronährstoff-Präparat mit 23 essentiellen Vitaminen und Mineralien.",
        "description_full": """Xtend+ ist das Multivitamin von Zinzino – entwickelt für optimale Bioverfügbarkeit.

ENTHALTEN:
• 23 essentielle Vitamine und Mineralien
• Phytonährstoffe aus 22 Obst- und Gemüsesorten
• Immununterstützende Pflanzenstoffe

BESONDERHEIT:
Xtend+ ist darauf ausgelegt, Lücken in der modernen Ernährung zu schließen und arbeitet synergistisch mit BalanceOil+ zusammen.""",
        "key_benefits": [
            "23 Vitamine & Mineralien",
            "Phytonährstoffe aus Obst & Gemüse",
            "Optimale Bioverfügbarkeit",
            "Synergistisch mit BalanceOil+"
        ],
        "price_hint": "Ab ca. 40€/Monat",
        "sort_order": 5
    },
]


# =============================================================================
# GUARDRAILS (Compliance-Regeln)
# =============================================================================

ZINZINO_GUARDRAILS: List[Dict[str, Any]] = [
    {
        "rule_name": "no_healing_claims",
        "rule_description": "Keine Heilversprechen oder Aussagen, dass Produkte Krankheiten diagnostizieren, behandeln oder heilen",
        "severity": "block",
        "trigger_patterns": [
            r"\bheilt\b", r"\bkuriert\b", r"\bbeseitigt\b",
            r"Krankheit.*behandeln", r"Diagnose.*stellen",
            r"garantiert.*gesund", r"100%.*Heilung",
            r"\bTherapie\b(?!.*Therapeut)", r"\bMedikament\b",
            r"gegen.*Krebs", r"gegen.*Diabetes", r"gegen.*Herz",
        ],
        "replacement_suggestion": "Formuliere um: 'unterstützt', 'kann beitragen zu', 'steht in Zusammenhang mit', 'Studien zeigen...'",
        "example_bad": "BalanceOil heilt Entzündungen und verhindert Herzinfarkte.",
        "example_good": "Studien zeigen einen Zusammenhang zwischen optimierter Omega-3-Versorgung und reduzierten Entzündungsmarkern.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "HCVO Art. 10, HWG §3"
    },
    {
        "rule_name": "no_income_guarantees",
        "rule_description": "Keine garantierten Einkommensversprechen im Network-Marketing",
        "severity": "block",
        "trigger_patterns": [
            r"garantiert.*verdienen", r"sicher.*Einkommen",
            r"schnell.*reich", r"\d+€.*pro.*Monat.*garantiert",
            r"passives Einkommen.*ohne.*Arbeit",
            r"jeder kann.*\d+€", r"Geld.*im.*Schlaf"
        ],
        "replacement_suggestion": "Betone: 'Einkommen hängt von individuellem Einsatz ab', 'Ergebnisse variieren'",
        "example_bad": "Mit Zinzino verdienst du garantiert 3.000€ im Monat!",
        "example_good": "Dein Einkommen bei Zinzino hängt von deinem Einsatz, deinen Fähigkeiten und deinem Netzwerk ab. Ergebnisse variieren individuell.",
        "applies_to": ["messages", "posts", "ads"],
        "legal_reference": "UWG §5, MLM-Richtlinien"
    },
    {
        "rule_name": "no_medical_advice",
        "rule_description": "Keine medizinische Beratung oder Diagnosestellung",
        "severity": "warn",
        "trigger_patterns": [
            r"du.*hast.*Krankheit", r"du.*hast.*Mangel",
            r"dein.*Arzt.*falsch", r"statt.*Medikament",
            r"besser.*als.*Tabletten", r"brauchst.*kein.*Arzt",
        ],
        "replacement_suggestion": "Verweise auf Fachpersonal: 'Besprich das am besten mit deinem Arzt'",
        "example_bad": "Du hast definitiv einen Omega-3-Mangel, nimm BalanceOil!",
        "example_good": "Der Test zeigt, wo deine Werte aktuell stehen. Bei medizinischen Fragen solltest du das mit deinem Arzt besprechen.",
        "applies_to": ["messages", "calls"],
        "legal_reference": "Heilpraktikergesetz"
    },
    {
        "rule_name": "science_accuracy",
        "rule_description": "Wissenschaftliche Aussagen müssen korrekt und vorsichtig formuliert sein",
        "severity": "suggest",
        "trigger_patterns": [
            r"wissenschaftlich.*bewiesen.*dass",
            r"Studien.*zeigen.*eindeutig",
            r"100%.*aller.*Studien",
            r"die.*Wissenschaft.*sagt.*definitiv"
        ],
        "replacement_suggestion": "Formuliere vorsichtiger: 'Studien deuten darauf hin', 'Forschung zeigt einen Zusammenhang'",
        "example_bad": "Es ist wissenschaftlich bewiesen, dass Omega-3 Krebs verhindert.",
        "example_good": "Studien zeigen einen Zusammenhang zwischen einer guten Omega-3-Versorgung und verschiedenen Gesundheitsmarkern.",
        "applies_to": ["messages", "posts", "presentations"],
        "legal_reference": "HCVO Art. 5-6"
    },
    {
        "rule_name": "partner_not_employee",
        "rule_description": "Klarstellung: Selbstständige Partner, nicht Angestellte",
        "severity": "suggest",
        "trigger_patterns": [
            r"ich.*arbeite.*für.*Zinzino",
            r"Zinzino.*Mitarbeiter",
            r"mein.*Arbeitgeber.*Zinzino",
        ],
        "replacement_suggestion": "Korrekte Formulierung: 'Ich bin selbstständiger Zinzino-Partner'",
        "example_bad": "Ich arbeite für Zinzino und bekomme jeden Monat mein Gehalt.",
        "example_good": "Ich bin selbstständiger Zinzino-Partner. Mein Einkommen kommt aus Provisionen basierend auf meiner Aktivität.",
        "applies_to": ["messages", "posts", "bio"],
        "legal_reference": "Gewerberecht, MLM-Compliance"
    },
]


# =============================================================================
# CHIEF MODE PROMPT (System-Prompt für Zinzino-Kontext)
# =============================================================================

ZINZINO_MODE_PROMPT = """
[ZINZINO-MODE – COMPLIANCE & TONE]

Du kommunizierst im Kontext von Zinzino – einem skandinavischen Health-Tech-Unternehmen
für testbasierte, personalisierte Ernährung.

═══════════════════════════════════════════════════════════════════════════════
COMPLIANCE-REGELN (STRIKTE EINHALTUNG)
═══════════════════════════════════════════════════════════════════════════════

1. KEINE MEDIZINISCHEN AUSSAGEN
   ❌ "BalanceOil heilt Entzündungen"
   ❌ "Verhindert Herzinfarkte"
   ❌ "Du hast einen Omega-3-Mangel" (= Diagnose)
   
   ✅ "Studien zeigen einen Zusammenhang zwischen..."
   ✅ "Kann zur normalen Funktion beitragen" (EFSA-Claim)
   ✅ "Der Test zeigt, wo deine Werte aktuell stehen"

2. TESTBASIERT ARGUMENTIEREN
   - Betone: Test → Produkt → Retest
   - Fokus auf messbare Veränderungen, nicht auf Gefühle
   - "Dein Ergebnis zeigt..." statt "Du brauchst..."
   - 95% Verbesserungsrate als Fakt (aus über 1 Mio. Tests)

3. ROLLE KLARSTELLEN
   ❌ "Ich arbeite für Zinzino"
   ✅ "Ich bin selbstständiger Zinzino-Partner"
   ✅ "Bei medizinischen Fragen: Bitte mit Arzt besprechen"

4. KEINE EINKOMMENSVERSPRECHEN
   ❌ "Du verdienst garantiert X€"
   ❌ "Schnell reich werden"
   ✅ "Einkommen hängt von deinem Einsatz ab"
   ✅ "Ergebnisse variieren individuell"

═══════════════════════════════════════════════════════════════════════════════
TON & STIL
═══════════════════════════════════════════════════════════════════════════════

• Skandinavisch-sachlich: Fakten statt Hype
• Selbstbewusst, aber nicht arrogant
• Verständlich, ohne zu simplifizieren
• Ermutigend: "Teste es, miss es, entscheide mit Daten"
• Kein Esoterik-Vibe, keine Wunderheilungs-Sprache

═══════════════════════════════════════════════════════════════════════════════
KERNBOTSCHAFTEN
═══════════════════════════════════════════════════════════════════════════════

• "Von Raten zu Wissen" – der Zinzino-Claim
• Test-Produkt-Retest: Das System, das funktioniert
• 95% verbessern ihre Balance bei korrekter Anwendung
• Langfristig denken: Gesundheit ist kein Sprint
• Messbar statt fühlbar: Zahlen statt Vermutungen

═══════════════════════════════════════════════════════════════════════════════
SPEZIFISCHE SITUATIONEN
═══════════════════════════════════════════════════════════════════════════════

Wenn es um KRANKHEITEN geht:
→ "Das kann ich nicht beurteilen – bitte sprich mit deinem Arzt."
→ "Der Test zeigt deine Werte, aber ersetzt keine ärztliche Diagnose."

Wenn es um BUSINESS/EINKOMMEN geht:
→ Ehrlich über Aufwand: "Es braucht Zeit und Einsatz"
→ Keine Garantien: "Ergebnisse hängen von vielen Faktoren ab"

Wenn es um WISSENSCHAFT geht:
→ Vorsichtig formulieren: "Studien zeigen...", "steht in Zusammenhang mit..."
→ Niemals: "bewiesen", "garantiert", "definitiv"

Wenn jemand SKEPTISCH ist:
→ Verstehe die Skepsis, nimm sie ernst
→ Biete den Test als neutrale Standortbestimmung an
→ "Schau dir deine eigenen Werte an – dann entscheide"

═══════════════════════════════════════════════════════════════════════════════
ZIEL
═══════════════════════════════════════════════════════════════════════════════

Du hilfst Zinzino-Partnern, professionell, faktenbasiert und compliant zu kommunizieren.
Du verstärkst ihre Professionalität, ohne rechtliche oder medizinische Grenzen zu überschreiten.
"""


# =============================================================================
# EXPORT FUNCTION
# =============================================================================

def get_zinzino_seed_data() -> Dict[str, Any]:
    """Gibt alle Zinzino Seed-Daten zurück"""
    return {
        "company": ZINZINO_COMPANY,
        "stories": ZINZINO_STORIES,
        "products": ZINZINO_PRODUCTS,
        "knowledge": ZINZINO_KNOWLEDGE,
        "guardrails": ZINZINO_GUARDRAILS,
        "chief_prompt": ZINZINO_MODE_PROMPT,
    }
