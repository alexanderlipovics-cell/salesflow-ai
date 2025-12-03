"""
╔════════════════════════════════════════════════════════════════════════════╗
║  VERTICALS KNOWLEDGE SEED                                                  ║
║  Branchenspezifisches Wissen für verschiedene Verticals                    ║
╚════════════════════════════════════════════════════════════════════════════╝

Enthält:
- Immobilien/Makler
- Gastro/Hotel
- B2B Investitionsgüter
"""

from typing import List, Dict, Any


# =============================================================================
# IMMOBILIEN / REAL ESTATE
# =============================================================================

REAL_ESTATE_OBJECTIONS = [
    # PREIS
    {
        "objection_type": "price",
        "objection_keywords": ["zu teuer", "provision", "maklergebühr", "prozent", "kosten"],
        "objection_example": "3,57% Provision ist mir zu viel.",
        "response_short": "Verstehe ich. Aber: Was kostet ein Fehlkauf? Wir finden den richtigen Käufer zum besten Preis - das zahlt sich aus.",
        "response_full": "Das verstehe ich. Aber rechnen wir mal: Wenn ich durch professionelle Vermarktung und Verhandlung nur 2% mehr für Ihre Immobilie raushole, haben Sie die Provision schon wieder drin - und müssen sich um nichts kümmern. Was würde es Sie kosten, wenn Sie monatelang keinen Käufer finden oder am Ende 20.000€ unter Wert verkaufen?",
        "response_technique": "roi_calculation",
        "follow_up_question": "Was wäre Ihnen wichtiger: Die Provision sparen oder zum bestmöglichen Preis verkaufen?",
        "vertical": "real_estate",
    },
    {
        "objection_type": "competitor",
        "objection_keywords": ["andere makler", "selbst verkaufen", "privat", "ohne makler", "immoscout"],
        "objection_example": "Ich verkaufe lieber selbst über ImmobilienScout.",
        "response_short": "Das machen viele - und verschenken oft 5-15% vom Verkaufspreis. Wir erreichen Käufer, die Sie nie finden würden.",
        "response_full": "Das kann ich verstehen, klingt erstmal günstiger. Aber: 80% der Käufer, die wirklich kaufbereit sind, kommen über Makler-Netzwerke und Off-Market-Kontakte. Auf ImmobilienScout tummeln sich viele 'Immobilien-Touristen'. Dazu kommt: Professionelle Verhandlung, rechtssichere Abwicklung, keine Besichtigungs-Marathons. Meine Kunden verkaufen im Schnitt 12% über dem Selbstverkauf-Preis.",
        "response_technique": "compare_value",
        "follow_up_question": "Haben Sie schon Erfahrung mit Besichtigungen gemacht? Wissen Sie, wie zeitaufwändig das wird?",
        "vertical": "real_estate",
    },
    
    # ZEIT
    {
        "objection_type": "time",
        "objection_keywords": ["keine eile", "später", "noch nicht", "erst mal schauen", "überlegen"],
        "objection_example": "Wir haben keine Eile mit dem Verkauf.",
        "response_short": "Verstehe. Aber: Der Markt ändert sich. Eine kostenlose Bewertung heute zeigt, wo Sie stehen - ohne Verpflichtung.",
        "response_full": "Das ist natürlich Ihre Entscheidung. Aber der Immobilienmarkt ist gerade in Bewegung - Zinsen, Nachfrage, Preise ändern sich. Eine aktuelle Marktwertanalyse kostet Sie nichts und verpflichtet zu nichts. Damit wissen Sie genau, was Ihre Immobilie heute wert ist - und können dann in Ruhe entscheiden, wann der beste Zeitpunkt ist.",
        "response_technique": "provide_value_first",
        "follow_up_question": "Wann hätten Sie Zeit für eine unverbindliche Bewertung?",
        "vertical": "real_estate",
    },
    
    # VERTRAUEN
    {
        "objection_type": "trust",
        "objection_keywords": ["alle gleich", "makler sind", "nur provision", "egal", "verkaufen eh"],
        "objection_example": "Makler wollen doch nur schnell verkaufen für ihre Provision.",
        "response_short": "Ich verstehe die Skepsis. Bei mir: Kein Alleinauftrag ohne Leistung. Ich verdiene nur, wenn Sie zufrieden sind.",
        "response_full": "Die Skepsis verstehe ich total - es gibt leider schwarze Schafe. Deshalb mein Ansatz: Ich arbeite mit klaren KPIs - Anzahl qualifizierter Interessenten, Besichtigungen, Feedback. Und ich sage Ihnen ehrlich, wenn der Preis unrealistisch ist, anstatt Monate zu verschwenden. Mein Ziel ist eine langfristige Empfehlung, nicht eine schnelle Provision.",
        "response_technique": "differentiate",
        "follow_up_question": "Was müsste ich tun, damit Sie mir vertrauen?",
        "vertical": "real_estate",
    },
    
    # EXKLUSIVVERTRAG
    {
        "objection_type": "commitment",
        "objection_keywords": ["exklusiv", "alleinauftrag", "gebunden", "mehrere makler", "parallel"],
        "objection_example": "Ich will mich nicht exklusiv an einen Makler binden.",
        "response_short": "Verstehe. Aber: Mit 5 Maklern parallel wirkt Ihre Immobilie 'verbrannt'. Ein Profi, volle Power, bestes Ergebnis.",
        "response_full": "Das kann ich nachvollziehen. Aber hier ist das Problem: Wenn Ihre Immobilie bei 5 Maklern gleichzeitig ist, sieht jeder potenzielle Käufer sie mehrfach - das wirkt verzweifelt und drückt den Preis. Mit einem Exklusivauftrag investiere ich voll: Professionelle Fotos, Videos, zielgerichtetes Marketing, mein komplettes Netzwerk. Das Ergebnis ist im Schnitt ein 8% höherer Verkaufspreis. Der Vertrag ist übrigens auf 3 Monate begrenzt.",
        "response_technique": "educate",
        "follow_up_question": "Was wäre Ihnen lieber: Schnell unter Wert oder optimal mit vollem Einsatz?",
        "vertical": "real_estate",
    },
    
    # BEWERTUNG
    {
        "objection_type": "price",
        "objection_keywords": ["zu niedrig", "mehr wert", "nachbar", "vergleich", "bewertung falsch"],
        "objection_example": "Mein Nachbar hat mehr für sein Haus bekommen.",
        "response_short": "Verstehe. Jede Immobilie ist anders. Zeigen Sie mir die Details - vielleicht liegt tatsächlich mehr drin.",
        "response_full": "Das höre ich öfter. Aber: Jede Immobilie ist einzigartig - Zustand, Lage, Ausstattung, Energieeffizienz. Selbst Nachbarhäuser können 20% Preisunterschied haben. Zeigen Sie mir, was Ihr Haus besonders macht. Vielleicht liegt ja wirklich mehr drin - und wenn nicht, erkläre ich Ihnen genau warum.",
        "response_technique": "question_back",
        "follow_up_question": "Wissen Sie, welche Ausstattung und Modernisierungen beim Nachbarn gemacht wurden?",
        "vertical": "real_estate",
    },
]

REAL_ESTATE_QUICK_FACTS = [
    {
        "fact_type": "differentiator",
        "fact_key": "premium_marketing",
        "fact_value": "Professionelle 360° Fotos, Drohnenaufnahmen und virtuelle Rundgänge für jede Immobilie.",
        "fact_short": "360° Fotos, Drohnen, virtuelle Rundgänge.",
        "importance": 95,
        "is_key_fact": True,
        "vertical": "real_estate",
    },
    {
        "fact_type": "number",
        "fact_key": "average_sale_price",
        "fact_value": "Unsere Objekte verkaufen sich im Schnitt 8-12% über dem Marktdurchschnitt.",
        "fact_short": "8-12% über Marktdurchschnitt.",
        "importance": 90,
        "is_key_fact": True,
        "vertical": "real_estate",
    },
    {
        "fact_type": "number",
        "fact_key": "average_time_to_sell",
        "fact_value": "Durchschnittliche Verkaufszeit: 45 Tage bis zur notariellen Beurkundung.",
        "fact_short": "45 Tage bis zum Notar.",
        "importance": 85,
        "is_key_fact": True,
        "vertical": "real_estate",
    },
    {
        "fact_type": "benefit",
        "fact_key": "buyer_network",
        "fact_value": "Über 2.500 vorgemerkte, qualifizierte Kaufinteressenten in unserer Datenbank.",
        "fact_short": "2.500+ vorgemerkte Käufer.",
        "importance": 80,
        "is_key_fact": False,
        "vertical": "real_estate",
    },
]


# =============================================================================
# GASTRO / HOTEL
# =============================================================================

GASTRO_HOTEL_OBJECTIONS = [
    # PREIS
    {
        "objection_type": "price",
        "objection_keywords": ["teuer", "budget", "kosten", "preis", "günstiger"],
        "objection_example": "Das ist uns zu teuer, wir haben ein knappes Budget.",
        "response_short": "Verstehe. Aber: Was kostet Sie ein verpasster Gast? Unser System spart 2h/Tag - rechnen Sie mal, was das wert ist.",
        "response_full": "Das verstehe ich. Aber lassen Sie uns kurz rechnen: Ihr Team verbringt täglich geschätzt 2-3 Stunden mit Anfragen, Reservierungen, FAQs. Bei einem Stundenlohn von 15€ sind das 1.000€+ pro Monat. Unser System kostet einen Bruchteil davon und arbeitet 24/7 - auch nachts, wenn der potenzielle Hochzeitsgast aus den USA anfragt.",
        "response_technique": "roi_calculation",
        "follow_up_question": "Wie viel Zeit verbringt Ihr Team aktuell mit Standardanfragen?",
        "vertical": "gastro_hotel",
    },
    
    # FUNKTIONIERT NICHT
    {
        "objection_type": "trust",
        "objection_keywords": ["ki funktioniert nicht", "chatbot nervt", "unpersönlich", "gäste mögen nicht"],
        "objection_example": "Unsere Gäste mögen keine Chatbots.",
        "response_short": "Verstehe. Aber: Unser Bot ist kein Standard-Chatbot. Er antwortet wie Ihr bester Mitarbeiter - persönlich, mit Ihrem Stil.",
        "response_full": "Das höre ich oft - und Sie haben Recht, schlechte Chatbots nerven. Aber unser System ist anders: Es lernt Ihren Ton, Ihre Persönlichkeit, Ihre Spezialangebote. Gäste merken oft nicht mal, dass es ein Bot ist. Und das Wichtigste: Bei komplexen Anfragen übergibt er nahtlos an Ihr Team. Die Kombination aus KI-Effizienz und menschlicher Wärme - das ist die Zukunft.",
        "response_technique": "differentiate",
        "follow_up_question": "Darf ich Ihnen zeigen, wie natürlich unser Bot mit Gästen spricht?",
        "vertical": "gastro_hotel",
    },
    
    # BESCHWERDEN
    {
        "objection_type": "product",
        "objection_keywords": ["beschwerde", "negativ", "kritik", "unzufrieden", "reklamation"],
        "objection_example": "Was passiert bei Beschwerden? Das kann keine KI.",
        "response_short": "Genau dafür ist unser Liability Shield. Der Bot antwortet diplomatisch UND eskaliert automatisch ans Team.",
        "response_full": "Gute Frage! Beschwerden sind heikel - deshalb haben wir den 'Diplomatic Mode'. Der Bot erkennt negative Stimmung, antwortet erst mal verständnisvoll und empathisch, und eskaliert automatisch an Ihr Team für die persönliche Lösung. Das Ergebnis: Der Gast fühlt sich sofort gehört, Ihr Team hat Zeit für die eigentliche Problemlösung.",
        "response_technique": "show_feature",
        "follow_up_question": "Wie viele Beschwerden bekommen Sie aktuell über digitale Kanäle?",
        "vertical": "gastro_hotel",
    },
    
    # UPSELLING
    {
        "objection_type": "need",
        "objection_keywords": ["upselling", "zusatzverkauf", "mehr verdienen", "revenue"],
        "objection_example": "Kann das System auch Upselling machen?",
        "response_short": "Absolut! Der Bot erkennt Gelegenheiten und schlägt passende Upgrades vor - Zimmer, Spa, Restaurant.",
        "response_full": "Ja, das ist einer der Hauptvorteile! Der Bot erkennt aus dem Gespräch Upselling-Gelegenheiten: Bei einer Buchung zum Jahrestag schlägt er das romantische Zimmer mit Champagner vor. Bei Familien das Kinderpaket. Bei Geschäftsreisenden den Early Check-in. Unsere Kunden berichten von 15-25% mehr Zusatzumsatz pro Buchung.",
        "response_technique": "show_benefit",
        "follow_up_question": "Welche Zusatzleistungen bieten Sie an, die wir einbauen könnten?",
        "vertical": "gastro_hotel",
    },
    
    # INTEGRATION
    {
        "objection_type": "product",
        "objection_keywords": ["integration", "pms", "buchungssystem", "protel", "apaleo", "mews"],
        "objection_example": "Funktioniert das mit unserem Buchungssystem?",
        "response_short": "Ja! Wir integrieren mit allen gängigen PMS - Protel, Apaleo, Mews, Opera und mehr.",
        "response_full": "Gute Frage! Wir haben fertige Integrationen für Protel, Apaleo, Mews, Oracle Opera, Cloudbeds und weitere. Der Bot kann direkt Verfügbarkeiten prüfen, Buchungen anlegen und Gästedaten abrufen. Die Einrichtung dauert typischerweise 2-3 Tage. Welches System nutzen Sie?",
        "response_technique": "provide_solution",
        "follow_up_question": "Welches PMS nutzen Sie aktuell?",
        "vertical": "gastro_hotel",
    },
]

GASTRO_HOTEL_QUICK_FACTS = [
    {
        "fact_type": "benefit",
        "fact_key": "24_7_availability",
        "fact_value": "24/7 Verfügbarkeit - auch nachts, an Feiertagen, wenn kein Team da ist.",
        "fact_short": "24/7 verfügbar, auch nachts.",
        "importance": 95,
        "is_key_fact": True,
        "vertical": "gastro_hotel",
    },
    {
        "fact_type": "number",
        "fact_key": "response_time",
        "fact_value": "Durchschnittliche Antwortzeit: Unter 3 Sekunden - schneller als jeder Mitarbeiter.",
        "fact_short": "< 3 Sekunden Antwortzeit.",
        "importance": 90,
        "is_key_fact": True,
        "vertical": "gastro_hotel",
    },
    {
        "fact_type": "number",
        "fact_key": "upselling_increase",
        "fact_value": "Hotels berichten von 15-25% mehr Zusatzumsatz durch intelligentes Upselling.",
        "fact_short": "15-25% mehr Zusatzumsatz.",
        "importance": 85,
        "is_key_fact": True,
        "vertical": "gastro_hotel",
    },
    {
        "fact_type": "benefit",
        "fact_key": "multilingual",
        "fact_value": "Spricht 50+ Sprachen fließend - perfekt für internationale Gäste.",
        "fact_short": "50+ Sprachen fließend.",
        "importance": 80,
        "is_key_fact": False,
        "vertical": "gastro_hotel",
    },
]


# =============================================================================
# B2B INVESTITIONSGÜTER
# =============================================================================

B2B_INVESTMENT_OBJECTIONS = [
    # PREIS / ROI
    {
        "objection_type": "price",
        "objection_keywords": ["zu teuer", "budget", "investition", "roi", "amortisation"],
        "objection_example": "Die Investition ist zu hoch für uns.",
        "response_short": "Verstehe. Aber: Was kostet Sie der Status quo? Lassen Sie uns die ROI-Rechnung gemeinsam machen.",
        "response_full": "Das verstehe ich - es ist eine Investition. Aber lassen Sie uns mal rechnen: Was kosten Sie aktuell die manuellen Prozesse? Fehler? Ausfallzeiten? Personalstunden? Bei den meisten unserer Kunden amortisiert sich die Investition in 12-18 Monaten. Danach ist es purer Gewinn. Darf ich Ihnen unseren ROI-Rechner zeigen?",
        "response_technique": "roi_calculation",
        "follow_up_question": "Wie viele Personalstunden gehen aktuell für diesen Prozess drauf?",
        "vertical": "b2b_investment",
    },
    
    # ENTSCHEIDER / GREMIUM
    {
        "objection_type": "authority",
        "objection_keywords": ["geschäftsführung", "vorstand", "gremium", "entscheidung", "freigabe", "budget"],
        "objection_example": "Das muss die Geschäftsführung entscheiden.",
        "response_short": "Verstehe. Ich unterstütze Sie gerne: Management-Summary, ROI-Berechnung, Referenzen - alles was Sie brauchen.",
        "response_full": "Das ist bei Investitionen dieser Größe normal. Lassen Sie mich Ihnen helfen: Ich bereite eine Management-Summary vor mit allen Key-Facts, die ROI-Berechnung für Ihre spezifische Situation, plus 2-3 Referenzkontakte aus Ihrer Branche. Damit haben Sie alles für ein überzeugendes internes Pitch-Deck. Wann ist das nächste Meeting?",
        "response_technique": "support_champion",
        "follow_up_question": "Was sind die wichtigsten Punkte, auf die Ihre GF achtet?",
        "vertical": "b2b_investment",
    },
    
    # KONKURRENZ
    {
        "objection_type": "competitor",
        "objection_keywords": ["andere anbieter", "vergleich", "wettbewerb", "alternative", "günstigere"],
        "objection_example": "Wir haben günstigere Angebote von anderen Anbietern.",
        "response_short": "Das höre ich öfter. Die Frage ist: Was kostet günstiger auf 5 Jahre? Service, Updates, Ausfallzeiten?",
        "response_full": "Verstehe. Aber lassen Sie uns mal die Total Cost of Ownership über 5 Jahre vergleichen: Was kostet der Service? Wie schnell reagieren die bei Problemen? Sind Updates inklusive? Wie hoch ist die Ausfallquote? Bei vielen 'günstigen' Alternativen zahlen Sie am Ende drauf. Unsere Maschinen laufen durchschnittlich 99,7% der Zeit - was ist das wert für Ihre Produktion?",
        "response_technique": "total_cost_comparison",
        "follow_up_question": "Darf ich Ihnen eine TCO-Analyse für beide Optionen erstellen?",
        "vertical": "b2b_investment",
    },
    
    # RISIKO / GARANTIE
    {
        "objection_type": "trust",
        "objection_keywords": ["risiko", "garantie", "was wenn", "funktioniert nicht", "ausfällt"],
        "objection_example": "Was passiert, wenn die Maschine ausfällt?",
        "response_short": "Gute Frage: 24/7 Hotline, Techniker vor Ort in 24h, Ersatzteile-Garantie. Sie sind nie allein.",
        "response_full": "Verständliche Sorge bei einer solchen Investition. Deshalb bieten wir: 24/7 Service-Hotline, Techniker vor Ort innerhalb von 24 Stunden, 5 Jahre Ersatzteil-Garantie, und optional einen Wartungsvertrag mit garantierten Reaktionszeiten. Dazu kommt unsere Remote-Diagnose - 70% der Probleme lösen wir ohne Vor-Ort-Einsatz. Bei kritischen Anlagen bieten wir sogar Leihgeräte während der Reparatur.",
        "response_technique": "remove_risk",
        "follow_up_question": "Wie kritisch wäre ein Ausfall für Ihre Produktion?",
        "vertical": "b2b_investment",
    },
    
    # ZEITRAHMEN
    {
        "objection_type": "time",
        "objection_keywords": ["jetzt nicht", "nächstes jahr", "planen", "budget", "zeitpunkt"],
        "objection_example": "Das Projekt ist für nächstes Jahr geplant.",
        "response_short": "Verstehe. Gerade deshalb: Jetzt planen, Preise sichern, rechtzeitig liefern. Die Lieferzeit beträgt aktuell 12 Wochen.",
        "response_full": "Das ist ein guter Planungshorizont. Aber bedenken Sie: Die Lieferzeit beträgt aktuell 12-16 Wochen, und die Preise für Rohstoffe steigen. Wenn Sie jetzt bestellen, sichern Sie sich den aktuellen Preis und die Installation ist genau dann fertig, wenn Sie's brauchen. Außerdem können wir in der Zwischenzeit die Mitarbeiter schulen.",
        "response_technique": "create_urgency",
        "follow_up_question": "Wann müsste die Anlage spätestens in Betrieb sein?",
        "vertical": "b2b_investment",
    },
    
    # KOMPLEXITÄT / SCHULUNG
    {
        "objection_type": "product",
        "objection_keywords": ["kompliziert", "schulung", "mitarbeiter", "bedienen", "umstellung"],
        "objection_example": "Das ist zu kompliziert für unsere Mitarbeiter.",
        "response_short": "Verstehe die Sorge. Aber: Moderne Touchscreen-Bedienung, 2-tägige Schulung, danach sind alle fit.",
        "response_full": "Diese Bedenken höre ich oft - aber unbegründet. Die Maschine hat eine intuitive Touchscreen-Oberfläche, fast wie ein Smartphone. Wir schulen Ihre Mitarbeiter 2 Tage vor Ort, liefern Video-Tutorials und eine deutsche Hotline. Nach einer Woche ist die Bedienung Routine. Ich kann Ihnen gerne Kontakt zu einem Kunden geben, der das gleiche dachte - und jetzt begeistert ist.",
        "response_technique": "remove_fear",
        "follow_up_question": "Darf ich Ihnen eine Demo vor Ort zeigen?",
        "vertical": "b2b_investment",
    },
]

B2B_INVESTMENT_QUICK_FACTS = [
    {
        "fact_type": "number",
        "fact_key": "roi_months",
        "fact_value": "Durchschnittliche Amortisationszeit: 12-18 Monate, danach purer Gewinn.",
        "fact_short": "12-18 Monate bis ROI.",
        "importance": 95,
        "is_key_fact": True,
        "vertical": "b2b_investment",
    },
    {
        "fact_type": "number",
        "fact_key": "uptime",
        "fact_value": "99,7% durchschnittliche Betriebszeit - Branchenführende Zuverlässigkeit.",
        "fact_short": "99,7% Uptime.",
        "importance": 90,
        "is_key_fact": True,
        "vertical": "b2b_investment",
    },
    {
        "fact_type": "benefit",
        "fact_key": "service_response",
        "fact_value": "24/7 Service-Hotline mit garantierter Reaktionszeit von 4 Stunden.",
        "fact_short": "24/7 Service, 4h Reaktionszeit.",
        "importance": 85,
        "is_key_fact": True,
        "vertical": "b2b_investment",
    },
    {
        "fact_type": "number",
        "fact_key": "customers",
        "fact_value": "Über 500 zufriedene Kunden in DACH, 95% Weiterempfehlungsrate.",
        "fact_short": "500+ Kunden, 95% empfehlen weiter.",
        "importance": 80,
        "is_key_fact": False,
        "vertical": "b2b_investment",
    },
    {
        "fact_type": "differentiator",
        "fact_key": "made_in_germany",
        "fact_value": "100% Made in Germany - Entwicklung, Produktion und Service aus einer Hand.",
        "fact_short": "100% Made in Germany.",
        "importance": 75,
        "is_key_fact": False,
        "vertical": "b2b_investment",
    },
]


# =============================================================================
# SEED FUNCTION
# =============================================================================

def seed_verticals_knowledge(db, company_id: str = None) -> dict:
    """
    Seeded alle branchenspezifischen Objections und Quick Facts.
    
    Args:
        db: Supabase Client
        company_id: Optional - wenn gesetzt, werden Daten für diese Company erstellt
        
    Returns:
        Dictionary mit Anzahl der erstellten Einträge
    """
    results = {
        "objections": 0,
        "quick_facts": 0,
    }
    
    all_objections = (
        REAL_ESTATE_OBJECTIONS + 
        GASTRO_HOTEL_OBJECTIONS + 
        B2B_INVESTMENT_OBJECTIONS
    )
    
    all_quick_facts = (
        REAL_ESTATE_QUICK_FACTS + 
        GASTRO_HOTEL_QUICK_FACTS + 
        B2B_INVESTMENT_QUICK_FACTS
    )
    
    # Seed Objections
    for obj in all_objections:
        try:
            data = {
                "company_id": company_id,
                "vertical": obj.get("vertical"),
                "objection_type": obj["objection_type"],
                "objection_keywords": obj.get("objection_keywords", []),
                "objection_example": obj.get("objection_example"),
                "response_short": obj["response_short"],
                "response_full": obj.get("response_full"),
                "response_technique": obj.get("response_technique"),
                "follow_up_question": obj.get("follow_up_question"),
                "source_type": "system",
                "language": "de",
            }
            db.table("objection_responses").insert(data).execute()
            results["objections"] += 1
        except Exception as e:
            print(f"Error seeding objection: {e}")
    
    # Seed Quick Facts
    for fact in all_quick_facts:
        try:
            data = {
                "company_id": company_id,
                "vertical": fact.get("vertical"),
                "fact_type": fact["fact_type"],
                "fact_key": fact["fact_key"],
                "fact_value": fact["fact_value"],
                "fact_short": fact.get("fact_short"),
                "importance": fact.get("importance", 50),
                "is_key_fact": fact.get("is_key_fact", False),
                "language": "de",
            }
            db.table("quick_facts").insert(data).execute()
            results["quick_facts"] += 1
        except Exception as e:
            print(f"Error seeding quick fact: {e}")
    
    print(f"Seeded verticals: {results}")
    return results


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "REAL_ESTATE_OBJECTIONS",
    "REAL_ESTATE_QUICK_FACTS",
    "GASTRO_HOTEL_OBJECTIONS",
    "GASTRO_HOTEL_QUICK_FACTS",
    "B2B_INVESTMENT_OBJECTIONS",
    "B2B_INVESTMENT_QUICK_FACTS",
    "seed_verticals_knowledge",
]

