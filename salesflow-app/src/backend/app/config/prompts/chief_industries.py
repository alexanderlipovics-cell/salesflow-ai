"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF UNIVERSAL INDUSTRY MODULE v3.0                                      ║
║  Branchenspezifische Sales Intelligence                                   ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieses Modul ermöglicht:
- Branchenspezifische Verkaufsstrategien
- Angepasste Einwandbehandlung pro Branche
- Typische Buyer Personas pro Industrie
- Regulatorische Compliance pro Sektor
"""

from typing import Optional, Dict, Any, List, Literal
from dataclasses import dataclass

# =============================================================================
# INDUSTRY DEFINITIONS
# =============================================================================

IndustryType = Literal[
    "network_marketing", "real_estate", "insurance", "finance",
    "b2b_saas", "b2b_services", "coaching", "automotive",
    "recruiting", "event_sales", "retail_high_ticket", "healthcare"
]


@dataclass
class IndustryProfile:
    """Vollständiges Branchenprofil"""
    id: str
    name: str
    description: str
    typical_sales_cycle: str
    avg_deal_size: str
    key_decision_factors: List[str]
    typical_objections: List[str]
    compliance_rules: List[str]
    recommended_frameworks: List[str]
    buyer_personas: List[Dict[str, str]]
    communication_style: Dict[str, str]
    trust_builders: List[str]
    red_flags: List[str]


# =============================================================================
# INDUSTRY PROFILES DATABASE
# =============================================================================

INDUSTRY_PROFILES: Dict[str, IndustryProfile] = {
    "network_marketing": IndustryProfile(
        id="network_marketing",
        name="Network Marketing / MLM",
        description="Direktvertrieb mit Teamaufbau und Provisionssystem",
        typical_sales_cycle="1-4 Wochen",
        avg_deal_size="50-500€ Erstbestellung",
        key_decision_factors=[
            "Vertrauen zum Verkäufer",
            "Produktqualität / Ergebnisse",
            "Community / Support",
            "Nebenverdienstmöglichkeit",
        ],
        typical_objections=[
            "Das ist doch Pyramidensystem!",
            "Ich kann nicht verkaufen",
            "Ich kenne niemanden",
            "Das ist zu teuer",
            "Das funktioniert nicht",
            "Ich hab keine Zeit",
        ],
        compliance_rules=[
            "Keine Einkommensversprechen ('Du verdienst garantiert X€')",
            "Keine Heilversprechen bei Gesundheitsprodukten",
            "Immer auf 'typische Ergebnisse variieren' hinweisen",
            "Kein Druck auf Starterpakete",
        ],
        recommended_frameworks=["solution", "challenger"],
        buyer_personas=[
            {"name": "Der Neugierige", "desc": "Will erstmal Produkt testen, kein Business"},
            {"name": "Der Nebenverdiener", "desc": "Sucht 500-1000€ extra pro Monat"},
            {"name": "Der Karrierewechsler", "desc": "Will Vollzeit einsteigen"},
            {"name": "Der Skeptiker", "desc": "Hat schlechte Erfahrungen mit MLM"},
        ],
        communication_style={
            "tone": "Freundschaftlich, authentisch, nicht pushy",
            "channel": "WhatsApp, Instagram DM, persönlich",
            "frequency": "2-3x pro Woche, nicht mehr",
        },
        trust_builders=[
            "Eigene Erfahrung/Transformation teilen",
            "Testimonials von echten Menschen",
            "Kein Druck, Einladung statt Überzeugung",
            "Transparenz über Kosten und Erwartungen",
        ],
        red_flags=[
            "Zu schneller Abschluss",
            "Nur über Geld reden",
            "Ignorieren von Bedenken",
            "Übertriebene Versprechen",
        ],
    ),
    
    "real_estate": IndustryProfile(
        id="real_estate",
        name="Immobilien",
        description="Verkauf und Vermietung von Immobilien",
        typical_sales_cycle="2-6 Monate",
        avg_deal_size="10.000-50.000€ Provision",
        key_decision_factors=[
            "Vertrauen und Kompetenz des Maklers",
            "Marktkenntnis und Netzwerk",
            "Verkaufspreis / Rendite",
            "Transparenz und Kommunikation",
        ],
        typical_objections=[
            "Die Provision ist zu hoch",
            "Ich verkaufe lieber privat",
            "Ich habe schon einen Makler",
            "Der Preis ist zu hoch/niedrig",
            "Der Markt ist gerade schlecht",
        ],
        compliance_rules=[
            "Keine unrealistischen Preisversprechen",
            "Energieausweis und rechtliche Dokumente erwähnen",
            "Provisionsmodell transparent kommunizieren",
        ],
        recommended_frameworks=["spin", "solution"],
        buyer_personas=[
            {"name": "Der Verkäufer", "desc": "Will schnell und gut verkaufen"},
            {"name": "Der Käufer", "desc": "Sucht Traumimmobilie oder Investition"},
            {"name": "Der Investor", "desc": "Fokus auf Rendite und Zahlen"},
            {"name": "Der Erbe", "desc": "Muss Immobilie aus Nachlass verkaufen"},
        ],
        communication_style={
            "tone": "Professionell, kompetent, vertrauenswürdig",
            "channel": "Telefon, E-Mail, persönliches Treffen",
            "frequency": "Nach Bedarf, regelmäßige Updates",
        },
        trust_builders=[
            "Referenzen und erfolgreiche Verkäufe",
            "Marktanalyse und Expertise zeigen",
            "Transparente Kommunikation",
            "Lokale Marktkenntnis",
        ],
        red_flags=[
            "Unrealistische Preisvorstellungen",
            "Keine klare Timeline",
            "Versteckte Mängel",
        ],
    ),
    
    "insurance": IndustryProfile(
        id="insurance",
        name="Versicherungen",
        description="Verkauf von Versicherungsprodukten",
        typical_sales_cycle="1-4 Wochen",
        avg_deal_size="500-5.000€ Jahresprämie",
        key_decision_factors=[
            "Vertrauen zum Berater",
            "Preis-Leistungs-Verhältnis",
            "Flexibilität und Service",
            "Verständlichkeit der Produkte",
        ],
        typical_objections=[
            "Ich habe schon eine Versicherung",
            "Das brauche ich nicht",
            "Versicherungen zahlen eh nie",
            "Das ist mir zu teuer",
            "Ich muss meine Frau/Mann fragen",
        ],
        compliance_rules=[
            "Beratungsdokumentation erforderlich",
            "Risikoaufklärung vor Abschluss",
            "Widerrufsrecht erwähnen",
            "Keine Garantien auf Leistungen",
        ],
        recommended_frameworks=["spin", "consultative"],
        buyer_personas=[
            {"name": "Der Vorsorger", "desc": "Plant langfristig, will Sicherheit"},
            {"name": "Der Skeptiker", "desc": "Misstraut Versicherungen grundsätzlich"},
            {"name": "Der Sparer", "desc": "Fokus auf günstigsten Preis"},
            {"name": "Der Umdenker", "desc": "Hat Lebenssituation geändert"},
        ],
        communication_style={
            "tone": "Seriös, vertrauenswürdig, erklärend",
            "channel": "Telefon, persönlich, Video-Call",
            "frequency": "Jährliche Überprüfung + bei Bedarf",
        },
        trust_builders=[
            "Unabhängige Beratung betonen",
            "Echte Schadensfälle erklären",
            "Transparenter Vergleich",
            "Langfristige Betreuung versprechen",
        ],
        red_flags=[
            "Zu schneller Abschluss ohne Bedarfsanalyse",
            "Kunde versteht Produkt nicht",
            "Falsche Angaben bei Gesundheitsfragen",
        ],
    ),
    
    "finance": IndustryProfile(
        id="finance",
        name="Finanzdienstleistungen",
        description="Finanzberatung, Investments, Altersvorsorge",
        typical_sales_cycle="2-8 Wochen",
        avg_deal_size="5.000-100.000€+ Investment",
        key_decision_factors=[
            "Vertrauen und Track Record",
            "Rendite vs. Risiko",
            "Transparenz der Kosten",
            "Langfristige Betreuung",
        ],
        typical_objections=[
            "Ich vertraue den Banken nicht mehr",
            "Das Risiko ist mir zu hoch",
            "Ich habe schon einen Berater",
            "Die Kosten sind zu hoch",
            "Ich möchte erstmal abwarten",
        ],
        compliance_rules=[
            "Keine Renditeversprechen",
            "Risiken klar kommunizieren",
            "Geeignetheitsprüfung durchführen",
            "BaFin/MiFID Compliance beachten",
        ],
        recommended_frameworks=["meddic", "spin"],
        buyer_personas=[
            {"name": "Der Konservative", "desc": "Sicherheit vor Rendite"},
            {"name": "Der Rendite-Jäger", "desc": "Will maximale Performance"},
            {"name": "Der Altersvorsorger", "desc": "Plant für die Rente"},
            {"name": "Der Einsteiger", "desc": "Erste Investments"},
        ],
        communication_style={
            "tone": "Professionell, kompetent, vertrauenswürdig",
            "channel": "Persönlich, Video, dann E-Mail/Telefon",
            "frequency": "Quartalsweise Updates + bei Marktbewegungen",
        },
        trust_builders=[
            "Zertifizierungen und Ausbildung zeigen",
            "Langfristige Kundenbeziehungen erwähnen",
            "Transparenz bei allen Kosten",
            "Unabhängigkeit betonen wenn gegeben",
        ],
        red_flags=[
            "Renditeversprechen",
            "Zeitdruck bei Entscheidung",
            "Unverständliche Produkte",
        ],
    ),
    
    "b2b_saas": IndustryProfile(
        id="b2b_saas",
        name="B2B SaaS",
        description="Software as a Service für Unternehmen",
        typical_sales_cycle="1-6 Monate",
        avg_deal_size="5.000-500.000€ ARR",
        key_decision_factors=[
            "ROI und Zeitersparnis",
            "Integration in bestehende Systeme",
            "Skalierbarkeit",
            "Support und Onboarding",
        ],
        typical_objections=[
            "Wir haben schon eine Lösung",
            "Die Integration ist zu aufwändig",
            "Das Budget ist nicht eingeplant",
            "Wir haben keine Zeit für die Umstellung",
            "Muss ich mit IT/Procurement besprechen",
        ],
        compliance_rules=[
            "DSGVO / Datenschutz beachten",
            "SLA-Bedingungen klar kommunizieren",
            "Security-Zertifizierungen erwähnen",
        ],
        recommended_frameworks=["gap", "meddic", "challenger"],
        buyer_personas=[
            {"name": "Der Champion", "desc": "Will intern für euch kämpfen"},
            {"name": "Der IT-Entscheider", "desc": "Fokus auf Tech/Integration"},
            {"name": "Der Business Owner", "desc": "Fokus auf ROI und Ergebnisse"},
            {"name": "Der Procurement", "desc": "Fokus auf Preis und Verträge"},
        ],
        communication_style={
            "tone": "Professionell, value-focused, datenbasiert",
            "channel": "LinkedIn, E-Mail, Video-Calls, Demos",
            "frequency": "Buyer-driven, schnelle Reaktionszeit",
        },
        trust_builders=[
            "Case Studies und ROI-Zahlen",
            "Kostenlose Trials / POCs",
            "Security-Zertifizierungen",
            "Referenzkunden in gleicher Branche",
        ],
        red_flags=[
            "Kein Budget Authority",
            "Keine klare Timeline",
            "Zu viele Stakeholder ohne Champion",
        ],
    ),
    
    "b2b_services": IndustryProfile(
        id="b2b_services",
        name="B2B Dienstleistungen",
        description="Agenturen, Beratung, Services für Unternehmen",
        typical_sales_cycle="2-8 Wochen",
        avg_deal_size="5.000-100.000€ Projektvolumen",
        key_decision_factors=[
            "Expertise und Track Record",
            "Chemie und Vertrauen",
            "Preis-Leistung",
            "Flexibilität und Verfügbarkeit",
        ],
        typical_objections=[
            "Wir machen das intern",
            "Zu teuer / Budget nicht da",
            "Wir haben schlechte Erfahrungen gemacht",
            "Zeitpunkt passt nicht",
        ],
        compliance_rules=[
            "Verträge und AGBs klar kommunizieren",
            "Scope genau definieren",
            "Datenschutz bei Kundendaten",
        ],
        recommended_frameworks=["solution", "spin"],
        buyer_personas=[
            {"name": "Der Entscheider", "desc": "Budget und final say"},
            {"name": "Der Anwender", "desc": "Wird mit euch arbeiten"},
            {"name": "Der Skeptiker", "desc": "Schlechte Erfahrung mit Agenturen"},
        ],
        communication_style={
            "tone": "Partnerschaftlich, kompetent, lösungsorientiert",
            "channel": "Persönlich, Video, dann E-Mail",
            "frequency": "Nach Projektstatus",
        },
        trust_builders=[
            "Portfolio und Referenzen",
            "Persönliche Chemie in Kennenlern-Calls",
            "Transparenter Projektplan",
            "Start mit kleinem Projekt möglich",
        ],
        red_flags=[
            "Scope Creep Gefahr",
            "Unrealistische Erwartungen",
            "Kein klarer Ansprechpartner",
        ],
    ),
    
    "coaching": IndustryProfile(
        id="coaching",
        name="Coaching & Training",
        description="Personal Coaching, Business Coaching, Training",
        typical_sales_cycle="1-4 Wochen",
        avg_deal_size="500-20.000€",
        key_decision_factors=[
            "Vertrauen und Sympathie",
            "Erfahrung und Resultate",
            "Methodik und Ansatz",
            "Verfügbarkeit und Format",
        ],
        typical_objections=[
            "Das ist mir zu teuer",
            "Ich schaffe das alleine",
            "Coaching ist nichts für mich",
            "Ich habe keine Zeit",
            "Mein Partner/Chef versteht das nicht",
        ],
        compliance_rules=[
            "Keine therapeutischen Versprechen",
            "Grenzen zu Therapie klar machen",
            "Vertraulichkeit zusichern",
        ],
        recommended_frameworks=["solution", "spin"],
        buyer_personas=[
            {"name": "Der Veränderungswillige", "desc": "Bereit für Transformation"},
            {"name": "Der Skeptiker", "desc": "Zweifelt an Coaching-Wert"},
            {"name": "Der Delegierte", "desc": "Wird von Firma geschickt"},
        ],
        communication_style={
            "tone": "Empathisch, professionell, motivierend",
            "channel": "Video-Call, persönlich, dann WhatsApp/E-Mail",
            "frequency": "Für den Verkaufsprozess: 2-3 Touchpoints",
        },
        trust_builders=[
            "Kostenloses Erstgespräch",
            "Testimonials und Erfolgsgeschichten",
            "Eigene Expertise/Erfahrung zeigen",
            "Keine Garantien, aber Commitment",
        ],
        red_flags=[
            "Unrealistische Erwartungen",
            "Nicht wirklich committet",
            "Will nur kostenlose Beratung",
        ],
    ),
    
    "automotive": IndustryProfile(
        id="automotive",
        name="Automotive / Fahrzeuge",
        description="Verkauf von Neu- und Gebrauchtwagen",
        typical_sales_cycle="1-8 Wochen",
        avg_deal_size="15.000-100.000€",
        key_decision_factors=[
            "Fahrzeug-Match (Bedürfnisse)",
            "Preis und Finanzierung",
            "Vertrauen zum Verkäufer",
            "Service und Garantie",
        ],
        typical_objections=[
            "Muss erstmal vergleichen",
            "Der Preis ist zu hoch",
            "Muss mit Partner sprechen",
            "Inzahlungnahme zu niedrig",
            "Lieferzeit zu lang",
        ],
        compliance_rules=[
            "Verbrauchswerte korrekt angeben",
            "Garantiebedingungen klar machen",
            "Widerrufsrecht bei Finanzierung",
        ],
        recommended_frameworks=["snap", "solution"],
        buyer_personas=[
            {"name": "Der Pragmatiker", "desc": "Auto ist Mittel zum Zweck"},
            {"name": "Der Enthusiast", "desc": "Auto ist Leidenschaft"},
            {"name": "Der Familienmensch", "desc": "Platz und Sicherheit wichtig"},
            {"name": "Der Preisbewusste", "desc": "Bestes Angebot finden"},
        ],
        communication_style={
            "tone": "Beratend, nicht aufdringlich",
            "channel": "Vor Ort, Telefon, WhatsApp",
            "frequency": "Nach Probefahrt: 2-3x nachfassen",
        },
        trust_builders=[
            "Probefahrt anbieten",
            "Transparente Preisgestaltung",
            "Fahrzeughistorie bei Gebrauchten",
            "Garantie-Optionen erklären",
        ],
        red_flags=[
            "Unrealistische Preisvorstellung",
            "Nur Probefahrt-Touristen",
            "Versteckte Schäden bei Inzahlungnahme",
        ],
    ),
    
    "recruiting": IndustryProfile(
        id="recruiting",
        name="Recruiting / Personalvermittlung",
        description="Vermittlung von Fach- und Führungskräften",
        typical_sales_cycle="1-3 Monate",
        avg_deal_size="5.000-30.000€ Provision",
        key_decision_factors=[
            "Qualität der Kandidaten",
            "Branchenexpertise",
            "Geschwindigkeit",
            "Erfolgsquote",
        ],
        typical_objections=[
            "Wir machen das intern",
            "Wir arbeiten schon mit anderen",
            "Die Provision ist zu hoch",
            "Wir haben gerade keinen Bedarf",
        ],
        compliance_rules=[
            "DSGVO bei Kandidatendaten",
            "AGG bei Stellenausschreibungen",
            "Vermittlungsvertrag vor Start",
        ],
        recommended_frameworks=["challenger", "spin"],
        buyer_personas=[
            {"name": "Der HR-Manager", "desc": "Verantwortlich für Hiring"},
            {"name": "Der Fachbereichsleiter", "desc": "Braucht die Leute"},
            {"name": "Der Geschäftsführer", "desc": "Strategische Stellen"},
        ],
        communication_style={
            "tone": "Professionell, ergebnisorientiert",
            "channel": "LinkedIn, Telefon, E-Mail",
            "frequency": "Regelmäßige Updates zu Kandidaten",
        },
        trust_builders=[
            "Erfolgsgeschichten und Referenzen",
            "Branchenexpertise zeigen",
            "Kandidatenqualität > Quantität",
            "Transparenter Prozess",
        ],
        red_flags=[
            "Kein konkreter Bedarf",
            "Unrealistische Gehaltsvorstellungen",
            "Zu viele Entscheider",
        ],
    ),
    
    "healthcare": IndustryProfile(
        id="healthcare",
        name="Healthcare / Medizinprodukte",
        description="Verkauf von Gesundheitsprodukten und -dienstleistungen",
        typical_sales_cycle="2-12 Wochen",
        avg_deal_size="100-50.000€",
        key_decision_factors=[
            "Evidenz und Studien",
            "Compliance und Zulassung",
            "Integration in Praxis/Klinik",
            "ROI / Kostenerstattung",
        ],
        typical_objections=[
            "Wir haben schon was Ähnliches",
            "Wird das erstattet?",
            "Zeigen Sie mir die Studien",
            "Der Aufwand für die Umstellung ist zu hoch",
        ],
        compliance_rules=[
            "MPG/MDR Konformität",
            "Keine Heilversprechen",
            "Studien korrekt zitieren",
            "Transparenz bei Kostenübernahme",
        ],
        recommended_frameworks=["meddic", "spin"],
        buyer_personas=[
            {"name": "Der Arzt", "desc": "Fokus auf Evidenz und Patientennutzen"},
            {"name": "Der Klinikmanager", "desc": "Fokus auf Kosten und Effizienz"},
            {"name": "Der Einkauf", "desc": "Fokus auf Preise und Verträge"},
        ],
        communication_style={
            "tone": "Wissenschaftlich, seriös, kompetent",
            "channel": "Persönlich, Kongresse, Fachmedien",
            "frequency": "Langfristige Beziehungspflege",
        },
        trust_builders=[
            "Peer-reviewed Studien",
            "KOL-Empfehlungen",
            "Zertifizierungen und Zulassungen",
            "Langfristiger Support",
        ],
        red_flags=[
            "Off-Label Verwendung",
            "Fehlende Studienlage",
            "Compliance-Bedenken",
        ],
    ),
}


# =============================================================================
# INDUSTRY PROMPT
# =============================================================================

CHIEF_INDUSTRY_PROMPT = """
[CHIEF - INDUSTRY INTELLIGENCE v3.0]

Du passt deine Sales-Strategie an die spezifische Branche an.

╔════════════════════════════════════════════════════════════════════════════╗
║  AKTIVE BRANCHE: {industry_name}                                           ║
╚════════════════════════════════════════════════════════════════════════════╝

{industry_description}

SALES CYCLE: {sales_cycle}
DEAL SIZE: {deal_size}

ENTSCHEIDUNGSFAKTOREN:
{decision_factors}

TYPISCHE EINWÄNDE:
{typical_objections}

COMPLIANCE BEACHTEN:
{compliance_rules}

BUYER PERSONAS:
{buyer_personas}

KOMMUNIKATIONSSTIL:
• Ton: {comm_tone}
• Kanal: {comm_channel}
• Frequenz: {comm_frequency}

VERTRAUEN AUFBAUEN:
{trust_builders}

RED FLAGS (Warnsignale):
{red_flags}

EMPFOHLENE FRAMEWORKS: {frameworks}

╔════════════════════════════════════════════════════════════════════════════╗
║  ANWENDUNG                                                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

1. Passe deine Sprache an die Branche an
2. Nutze branchenspezifische Beispiele
3. Beachte die Compliance-Regeln strikt
4. Erkenne die Buyer Persona und passe dich an
5. Achte auf die typischen Einwände und bereite vor
"""


# =============================================================================
# BUILDER FUNCTIONS
# =============================================================================

def get_industry_profile(industry_id: str) -> IndustryProfile:
    """Holt ein Branchenprofil nach ID."""
    return INDUSTRY_PROFILES.get(industry_id, INDUSTRY_PROFILES["b2b_services"])


def build_industry_prompt(industry_id: str) -> str:
    """
    Baut einen branchenspezifischen Prompt.
    
    Args:
        industry_id: Die Branchen-ID
    
    Returns:
        Formatierter Prompt
    """
    profile = get_industry_profile(industry_id)
    
    decision_factors = "\n".join([f"• {f}" for f in profile.key_decision_factors])
    typical_objections = "\n".join([f"• \"{o}\"" for o in profile.typical_objections])
    compliance_rules = "\n".join([f"⚠️ {r}" for r in profile.compliance_rules])
    trust_builders = "\n".join([f"✓ {t}" for t in profile.trust_builders])
    red_flags = "\n".join([f"🚩 {r}" for r in profile.red_flags])
    
    buyer_personas = "\n".join([
        f"• {p['name']}: {p['desc']}" for p in profile.buyer_personas
    ])
    
    return CHIEF_INDUSTRY_PROMPT.format(
        industry_name=profile.name.upper(),
        industry_description=profile.description,
        sales_cycle=profile.typical_sales_cycle,
        deal_size=profile.avg_deal_size,
        decision_factors=decision_factors,
        typical_objections=typical_objections,
        compliance_rules=compliance_rules,
        buyer_personas=buyer_personas,
        comm_tone=profile.communication_style.get("tone", ""),
        comm_channel=profile.communication_style.get("channel", ""),
        comm_frequency=profile.communication_style.get("frequency", ""),
        trust_builders=trust_builders,
        red_flags=red_flags,
        frameworks=", ".join(profile.recommended_frameworks),
    )


def get_industry_objection_response(
    industry_id: str,
    objection_type: str,
) -> Dict[str, str]:
    """
    Gibt branchenspezifische Einwandbehandlung.
    
    Args:
        industry_id: Die Branchen-ID
        objection_type: Der Einwandtyp (z.B. "pyramid", "price", "time")
    
    Returns:
        Strategie und Beispielformulierung
    """
    industry_responses = {
        "network_marketing": {
            "pyramid": {
                "strategy": "Unterschied zu Pyramide erklären + eigene Erfahrung",
                "example": "Verstehe ich total. Der Unterschied: Bei Pyramiden gibt's kein echtes Produkt. Hier verdienst du am Produktverkauf, nicht am Recruiting. Ich selbst verdiene hauptsächlich durch...",
            },
            "cant_sell": {
                "strategy": "Reframe: Es geht um Teilen, nicht Verkaufen",
                "example": "Das ist das Schöne: Es geht nicht ums Verkaufen, sondern ums Teilen. Wie wenn du einem Freund ein gutes Restaurant empfiehlst. Hast du schonmal was empfohlen?",
            },
            "no_network": {
                "strategy": "Social Media + Netzwerk wächst",
                "example": "Jeder startet bei null. Heute gibt's Social Media - da baust du dir ein Netzwerk auf. Und: Durch die Produkte triffst du automatisch neue Leute.",
            },
        },
        "real_estate": {
            "commission": {
                "strategy": "Wert der Dienstleistung zeigen + Netto-Rechnung",
                "example": "Ich verstehe. Aber rechnen wir mal: Ohne Makler erzielen Verkäufer im Schnitt 10-15% weniger. Bei eurem Objekt wären das etwa X€. Meine Provision ist Y€. Macht unterm Strich...",
            },
            "sell_private": {
                "strategy": "Aufwand zeigen + Risiken",
                "example": "Kann ich verstehen. Aber habt ihr Zeit für 30+ Besichtigungen, rechtssichere Verträge und Preisverhandlungen? Die meisten unterschätzen den Aufwand massiv.",
            },
        },
        "insurance": {
            "dont_need": {
                "strategy": "Risiko-Szenario + konkretes Beispiel",
                "example": "Das hoffe ich auch für dich! Aber letzte Woche hatte ich einen Kunden mit genau der Einstellung. Dann [Szenario]. Seitdem... - Ist es nicht besser, vorbereitet zu sein?",
            },
            "never_pay": {
                "strategy": "Konkrete Fälle + Statistik",
                "example": "Verstehe die Skepsis. Letztes Jahr haben wir für unsere Kunden X€ reguliert. Hier sind 3 echte Fälle... Der Trick ist, die richtige Versicherung für deine Situation zu haben.",
            },
        },
        "b2b_saas": {
            "have_solution": {
                "strategy": "Nicht ersetzen sondern ergänzen / verbessern",
                "example": "Super, dass ihr schon was habt! Wir ersetzen das auch nicht unbedingt. Viele unserer Kunden nutzen [Tool] UND uns. Der Unterschied ist [USP]. Wäre ein Vergleich interessant?",
            },
            "integration_effort": {
                "strategy": "Onboarding-Prozess zeigen + konkrete Zeit",
                "example": "Verstehe. Unser Onboarding dauert im Schnitt 2 Wochen. Wir haben einen dedizierten Success Manager der das für euch übernimmt. [Kunde X] war in 10 Tagen live.",
            },
        },
    }
    
    industry = industry_responses.get(industry_id, {})
    return industry.get(objection_type, {
        "strategy": "Empathie zeigen + Frage stellen",
        "example": "Das verstehe ich. Erzähl mir mehr - was genau meinst du damit?",
    })


def list_all_industries() -> List[Dict[str, str]]:
    """Listet alle verfügbaren Branchen."""
    return [
        {"id": k, "name": v.name, "description": v.description}
        for k, v in INDUSTRY_PROFILES.items()
    ]


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "IndustryType",
    "IndustryProfile",
    "INDUSTRY_PROFILES",
    "CHIEF_INDUSTRY_PROMPT",
    "get_industry_profile",
    "build_industry_prompt",
    "get_industry_objection_response",
    "list_all_industries",
]

