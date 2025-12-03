"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVE ASSIST SEED DATA                                                     ║
║  Demo-Daten für Quick Facts, Objection Responses & Vertical Knowledge      ║
╚════════════════════════════════════════════════════════════════════════════╝

Ausführen:
    cd backend
    python -m seeds.live_assist_seed
"""

import os
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

import psycopg2
from psycopg2.extras import execute_values

# Supabase Connection
PROJECT_REF = "lncwvbhcafkdorypnpnz"


def get_connection():
    """Erstellt DB-Verbindung."""
    db_password = os.getenv('SUPABASE_DB_PASSWORD')
    return psycopg2.connect(
        f'postgresql://postgres:{db_password}@db.{PROJECT_REF}.supabase.co:5432/postgres'
    )


def seed_quick_facts(cursor):
    """Seeded Quick Facts für verschiedene Verticals."""
    
    print("📊 Seeding Quick Facts...")
    
    quick_facts = [
        # Network Marketing / Health & Wellness (Zinzino-Style)
        {
            "vertical": "network_marketing",
            "fact_type": "percentage",
            "fact_key": "omega_balance_improvement",
            "fact_value": "90% der Nutzer verbessern ihre Omega-3/6 Balance innerhalb von 120 Tagen nachweisbar.",
            "fact_short": "90% verbessern in 120 Tagen",
            "importance": 95,
            "is_key_fact": True,
            "source": "Interne Statistik"
        },
        {
            "vertical": "network_marketing",
            "fact_type": "number",
            "fact_key": "blood_tests_performed",
            "fact_value": "Über 1 Million Bluttests wurden weltweit durchgeführt.",
            "fact_short": "1 Mio+ Bluttests weltweit",
            "importance": 90,
            "is_key_fact": True,
            "source": "Unternehmensstatistik"
        },
        {
            "vertical": "network_marketing",
            "fact_type": "comparison",
            "fact_key": "omega_ratio_europe",
            "fact_value": "Europäer haben durchschnittlich ein Omega-Verhältnis von 15:1 statt optimal 3:1.",
            "fact_short": "15:1 statt 3:1 optimal",
            "importance": 85,
            "is_key_fact": True,
            "source": "Wissenschaftliche Studien"
        },
        {
            "vertical": "network_marketing",
            "fact_type": "differentiator",
            "fact_key": "test_based_nutrition",
            "fact_value": "Test-basierte Ernährung: Bluttest vor und nach 120 Tagen zeigt messbare Ergebnisse.",
            "fact_short": "Bluttest vorher/nachher",
            "importance": 95,
            "is_key_fact": True,
            "source": "USP"
        },
        {
            "vertical": "network_marketing",
            "fact_type": "benefit",
            "fact_key": "daily_cost",
            "fact_value": "Pro Tag kostet das Programm etwa 1,50€ – weniger als ein Kaffee.",
            "fact_short": "~1,50€/Tag",
            "importance": 80,
            "is_key_fact": False,
            "source": "Preiskalkulation"
        },
        
        # Real Estate
        {
            "vertical": "real_estate",
            "fact_type": "percentage",
            "fact_key": "price_increase_5y",
            "fact_value": "Immobilienpreise sind in den letzten 5 Jahren um durchschnittlich 45% gestiegen.",
            "fact_short": "+45% in 5 Jahren",
            "importance": 90,
            "is_key_fact": True,
            "source": "Marktdaten"
        },
        {
            "vertical": "real_estate",
            "fact_type": "number",
            "fact_key": "avg_selling_time",
            "fact_value": "Attraktive Objekte werden durchschnittlich in 45 Tagen verkauft.",
            "fact_short": "Ø 45 Tage Verkaufszeit",
            "importance": 85,
            "is_key_fact": True,
            "source": "Interne Statistik"
        },
        {
            "vertical": "real_estate",
            "fact_type": "comparison",
            "fact_key": "rent_vs_buy",
            "fact_value": "Bei aktuellen Zinsen kostet Kaufen monatlich oft weniger als Mieten.",
            "fact_short": "Kaufen < Mieten",
            "importance": 80,
            "is_key_fact": False,
            "source": "Finanzrechnung"
        },
        
        # Financial Services
        {
            "vertical": "financial_services",
            "fact_type": "percentage",
            "fact_key": "retirement_gap",
            "fact_value": "Die durchschnittliche Rentenlücke beträgt 500-800€ pro Monat.",
            "fact_short": "500-800€ Rentenlücke",
            "importance": 90,
            "is_key_fact": True,
            "source": "Statistisches Bundesamt"
        },
        {
            "vertical": "financial_services",
            "fact_type": "number",
            "fact_key": "compound_effect",
            "fact_value": "100€ monatlich über 30 Jahre bei 6% Rendite werden zu über 100.000€.",
            "fact_short": "100€/Monat → 100k€",
            "importance": 85,
            "is_key_fact": True,
            "source": "Zinseszinsrechnung"
        },
        
        # Coaching
        {
            "vertical": "coaching_training",
            "fact_type": "percentage",
            "fact_key": "goal_achievement",
            "fact_value": "Menschen mit Coach erreichen ihre Ziele 70% häufiger als ohne.",
            "fact_short": "70% höhere Zielerreichung",
            "importance": 90,
            "is_key_fact": True,
            "source": "ICF Studie"
        },
        {
            "vertical": "coaching_training",
            "fact_type": "benefit",
            "fact_key": "roi_coaching",
            "fact_value": "Unternehmen berichten von 7x ROI bei Executive Coaching.",
            "fact_short": "7x ROI",
            "importance": 85,
            "is_key_fact": True,
            "source": "Manchester Review"
        }
    ]
    
    for fact in quick_facts:
        cursor.execute("""
            INSERT INTO la_quick_facts 
            (vertical, fact_type, fact_key, fact_value, fact_short, importance, is_key_fact, source, is_active, language)
            VALUES (%(vertical)s, %(fact_type)s, %(fact_key)s, %(fact_value)s, %(fact_short)s, %(importance)s, %(is_key_fact)s, %(source)s, true, 'de')
            ON CONFLICT DO NOTHING
        """, fact)
    
    print(f"   ✅ {len(quick_facts)} Quick Facts eingefügt")


def seed_objection_responses(cursor):
    """Seeded Objection Responses für häufige Einwände."""
    
    print("💬 Seeding Objection Responses...")
    
    objection_responses = [
        # Price Objections
        {
            "objection_type": "price",
            "objection_example": "Das ist mir zu teuer.",
            "response_short": "Verstehe ich. Runtergebrochen sind das etwa 1,50€ am Tag – weniger als ein Kaffee – und du bekommst messbare Ergebnisse.",
            "response_full": "Verstehe ich total. Lass uns mal kurz rechnen: Runtergebrochen sind das etwa 1,50€ am Tag – weniger als ein Kaffee. Und der Unterschied ist: Nach 120 Tagen siehst du im Bluttest schwarz auf weiß, ob es wirkt. Bei wie vielen Sachen investierst du Geld und weißt nicht mal, ob sie was bringen?",
            "response_technique": "reduce_to_daily",
            "follow_up_question": "Was wäre es dir wert, wenn du wüsstest, dass dein Körper optimal versorgt ist?",
            "vertical": "network_marketing"
        },
        {
            "objection_type": "price",
            "objection_example": "Ich habe kein Budget dafür.",
            "response_short": "Verstehe. Wo siehst du denn Prioritäten für deine Gesundheit? Oft geht es weniger ums Geld, mehr um Entscheidungen.",
            "response_full": "Das höre ich oft. Aber lass mich fragen: Was gibst du monatlich für Dinge aus, die dir nicht wirklich was bringen? Streaming, Impulskäufe, Essen gehen? Es geht oft weniger ums Budget, mehr darum, wofür wir uns entscheiden. Deine Gesundheit ist die Basis für alles andere.",
            "response_technique": "reframe_priorities",
            "follow_up_question": "Was wäre ein realistisches Budget für deine Gesundheit?",
            "vertical": "network_marketing"
        },
        
        # Time Objections
        {
            "objection_type": "time",
            "objection_example": "Ich habe gerade keine Zeit.",
            "response_short": "Verstehe, du hast viel um die Ohren. Gerade deswegen: Das dauert nur 30 Sekunden am Tag – ein Löffel Öl, fertig.",
            "response_full": "Das verstehe ich. Gerade WEIL du so beschäftigt bist, ist das interessant: Ein Löffel Öl am Morgen, 30 Sekunden – fertig. Keine Termine, keine Umstellung. Und nach 4 Monaten weißt du genau, ob dein Körper besser funktioniert.",
            "response_technique": "minimize_effort",
            "follow_up_question": "Wann wäre ein besserer Zeitpunkt, 5 Minuten darüber zu sprechen?",
            "vertical": "network_marketing"
        },
        {
            "objection_type": "time",
            "objection_example": "Meld dich später nochmal.",
            "response_short": "Klar, wann passt es dir? Lass uns direkt einen Termin machen, dann vergessen wir's nicht.",
            "response_full": "Verstehe, kein Problem. Lass uns kurz einen konkreten Termin machen – wann in den nächsten Tagen hast du 15 Minuten? Dann muss ich dich nicht ständig anrufen und du hast es aus dem Kopf.",
            "response_technique": "lock_next_step",
            "follow_up_question": "Passt dir eher morgens oder nachmittags besser?",
            "vertical": None  # Universell
        },
        
        # Trust/Skepticism Objections
        {
            "objection_type": "trust",
            "objection_example": "Das klingt zu gut um wahr zu sein.",
            "response_short": "Die Skepsis ist normal. Genau dafür gibt's den Bluttest: Du siehst deine eigenen Werte, nicht meine Versprechen.",
            "response_full": "Diese Skepsis ist völlig berechtigt – es gibt so viel Mist auf dem Markt. Der Unterschied hier: Du musst mir nichts glauben. Du machst einen Bluttest vorher, nimmst das Produkt 120 Tage, machst einen Test nachher. Deine eigenen Werte zeigen dir, ob es funktioniert. Schwarz auf weiß.",
            "response_technique": "offer_proof",
            "follow_up_question": "Was müsstest du sehen, um überzeugt zu sein?",
            "vertical": "network_marketing"
        },
        {
            "objection_type": "trust",
            "objection_example": "Das ist doch so ein MLM-Ding.",
            "response_short": "Fairer Punkt. Ich verstehe die Skepsis bei Vertriebsmodellen. Ich bin hier wegen der Produkte – die sind messbar. Willst du über das Produkt reden?",
            "response_full": "Ich verstehe den Vorbehalt – es gibt viel Müll in der Branche. Hier ist der Unterschied: Bei den meisten Sachen weißt du nicht, ob sie wirken. Hier machst du einen Bluttest vorher und nachher. Ich bin nicht hier, um dir ein Business aufzuschwatzen – ich bin hier, weil das Produkt messbar funktioniert.",
            "response_technique": "acknowledge_and_differentiate",
            "follow_up_question": "Magst du erstmal nur über das Produkt sprechen, ohne Business-Thema?",
            "vertical": "network_marketing"
        },
        
        # Need Objections
        {
            "objection_type": "need",
            "objection_example": "Ich esse viel Fisch, brauche das nicht.",
            "response_short": "Super, Fisch ist gut! Die Frage ist: Reicht es? Der Bluttest zeigt dir genau, wo du stehst.",
            "response_full": "Das ist schon mal gut! Die Frage ist nur: Wie viel Fisch müsstest du essen, um wirklich im optimalen Bereich zu sein? Spoiler: Es ist mehr als du denkst. Der Bluttest zeigt dir schwarz auf weiß, wie dein aktuelles Verhältnis ist. Viele, die 'viel Fisch essen', sind trotzdem bei 12:1 oder 15:1 statt bei 3:1.",
            "response_technique": "challenge_assumption",
            "follow_up_question": "Wärst du neugierig, deine echten Werte zu sehen?",
            "vertical": "network_marketing"
        },
        {
            "objection_type": "need",
            "objection_example": "Ich bin gesund, brauche das nicht.",
            "response_short": "Klasse, dass du dich gesund fühlst! Die meisten mit schlechtem Omega-Verhältnis fühlen sich auch gesund – bis es nicht mehr so ist.",
            "response_full": "Freut mich, dass du dich gut fühlst! Aber hier ist das Ding: 97% der Menschen haben ein suboptimales Omega-Verhältnis – und die meisten fühlen sich trotzdem 'gesund'. Die Frage ist: Willst du reagieren wenn Probleme kommen, oder vorher wissen, dass alles stimmt?",
            "response_technique": "future_pace",
            "follow_up_question": "Wann hattest du zuletzt einen Check-up gemacht?",
            "vertical": "network_marketing"
        },
        
        # Think About It Objections
        {
            "objection_type": "think_about_it",
            "objection_example": "Ich muss das erstmal überlegen.",
            "response_short": "Klar, verstehe. Was genau möchtest du noch klären? Vielleicht kann ich dir direkt helfen.",
            "response_full": "Absolut, das ist eine Entscheidung die du bewusst treffen solltest. Lass mich fragen: Worüber genau möchtest du nachdenken? Oft kann ich direkt die Fragen beantworten, die noch offen sind – dann hast du alle Infos für deine Entscheidung.",
            "response_technique": "isolate_objection",
            "follow_up_question": "Was ist die eine Sache, die du noch wissen müsstest?",
            "vertical": None  # Universell
        },
        {
            "objection_type": "think_about_it",
            "objection_example": "Ich muss das mit meinem Partner besprechen.",
            "response_short": "Absolut, gute Idee! Soll ich dir was schicken, das ihr zusammen anschauen könnt?",
            "response_full": "Finde ich super, dass ihr wichtige Entscheidungen gemeinsam trefft. Lass mich dir was schicken – eine kurze Zusammenfassung mit den wichtigsten Punkten. Dann kann dein Partner sich informieren und ihr entscheidet gemeinsam. Wann sprecht ihr drüber?",
            "response_technique": "include_partner",
            "follow_up_question": "Wann habt ihr Zeit, euch das zusammen anzuschauen?",
            "vertical": None  # Universell
        },
        
        # Competitor Objections
        {
            "objection_type": "competitor",
            "objection_example": "Ich nehme schon Omega-3 von woanders.",
            "response_short": "Super, dass du schon supplementierst! Die Frage ist: Weißt du, ob es wirklich wirkt? Der Bluttest zeigt's dir.",
            "response_full": "Toll, dass du schon was tust! Die entscheidende Frage ist: Weißt du, ob es wirklich funktioniert? Die meisten Standard-Omega-3 Produkte werden vom Körper nicht optimal aufgenommen. Hier ist der Unterschied: Du machst einen Bluttest und siehst, wie dein Verhältnis wirklich ist. Wenn es gut ist – super, bleib dabei. Wenn nicht, weißt du, dass du was ändern solltest.",
            "response_technique": "test_current_solution",
            "follow_up_question": "Hast du dein Omega-Verhältnis schon mal gemessen?",
            "vertical": "network_marketing"
        }
    ]
    
    for resp in objection_responses:
        cursor.execute("""
            INSERT INTO la_objection_responses 
            (objection_type, objection_example, response_short, response_full, response_technique, follow_up_question, vertical, is_active, language, source_type)
            VALUES (%(objection_type)s, %(objection_example)s, %(response_short)s, %(response_full)s, %(response_technique)s, %(follow_up_question)s, %(vertical)s, true, 'de', 'system')
            ON CONFLICT DO NOTHING
        """, resp)
    
    print(f"   ✅ {len(objection_responses)} Objection Responses eingefügt")


def seed_vertical_knowledge(cursor):
    """Seeded Vertical Knowledge für verschiedene Branchen."""
    
    print("📚 Seeding Vertical Knowledge...")
    
    vertical_knowledge = [
        # Network Marketing
        {
            "vertical": "network_marketing",
            "knowledge_type": "terminology",
            "topic": "Omega-3/6 Verhältnis",
            "question": "Was ist das Omega-3/6 Verhältnis?",
            "answer_short": "Das Verhältnis zwischen Omega-6 und Omega-3 Fettsäuren im Körper. Optimal ist 3:1, die meisten haben 15:1 oder schlechter.",
            "answer_full": "Das Omega-3/6 Verhältnis beschreibt das Gleichgewicht zwischen entzündungsfördernden (Omega-6) und entzündungshemmenden (Omega-3) Fettsäuren im Körper. Ein optimales Verhältnis liegt bei etwa 3:1. Durch moderne Ernährung haben die meisten Menschen ein Verhältnis von 15:1 bis 25:1, was mit verschiedenen Gesundheitsproblemen assoziiert wird.",
            "keywords": ["omega", "fettsäuren", "verhältnis", "balance", "entzündung"]
        },
        {
            "vertical": "network_marketing",
            "knowledge_type": "best_practice",
            "topic": "Einwandbehandlung MLM",
            "question": "Wie gehe ich mit MLM-Skepsis um?",
            "answer_short": "Skepsis anerkennen, auf das Produkt fokussieren, Beweise anbieten statt Versprechen.",
            "answer_full": "Bei MLM-Skepsis: 1) Skepsis validieren ('Ich verstehe die Vorsicht'), 2) Differenzieren ('Der Unterschied hier ist...'), 3) Fokus auf Produkt statt Business, 4) Beweise anbieten (Tests, Studien), 5) Kein Druck, Entscheidung beim Kunden lassen.",
            "keywords": ["mlm", "skepsis", "einwand", "pyramide", "vertrauen"]
        },
        
        # Real Estate
        {
            "vertical": "real_estate",
            "knowledge_type": "market_data",
            "topic": "Immobilienfinanzierung",
            "question": "Was sind aktuelle Finanzierungsmöglichkeiten?",
            "answer_short": "Annuitätendarlehen, KfW-Förderung, Bausparverträge. Zinsen aktuell bei 3-4%.",
            "answer_full": "Aktuelle Optionen: Annuitätendarlehen (feste Raten), KfW-Förderung (günstige Zinsen für energetisches Bauen), Bausparverträge, Volltilgerdarlehen. Aktuelle Zinsen liegen bei etwa 3-4% für 10-15 Jahre Bindung. Eigenkapital von 20-30% empfohlen.",
            "keywords": ["finanzierung", "kredit", "zinsen", "kfw", "eigenkapital"]
        },
        {
            "vertical": "real_estate",
            "knowledge_type": "best_practice",
            "topic": "Besichtigungstermine",
            "question": "Wie führe ich erfolgreiche Besichtigungen?",
            "answer_short": "Vorbereitung, Storytelling zur Immobilie, Fragen stellen, Emotionen wecken, nächsten Schritt vereinbaren.",
            "answer_full": "Erfolgreiche Besichtigung: 1) Vorab-Info zur Immobilie, 2) Pünktlichkeit und professionelles Auftreten, 3) Story zur Immobilie erzählen (nicht nur Fakten), 4) Fragen stellen ('Wie würden Sie diesen Raum nutzen?'), 5) Emotionen wecken (Licht an, Vorhänge auf), 6) Konkrete nächsten Schritt vereinbaren.",
            "keywords": ["besichtigung", "termin", "verkauf", "präsentation"]
        },
        
        # Financial Services
        {
            "vertical": "financial_services",
            "knowledge_type": "regulation",
            "topic": "Beratungspflichten",
            "question": "Welche Beratungspflichten gibt es?",
            "answer_short": "Anlegergerechte Beratung, Produktinformation, Risikoaufklärung, Dokumentation. MiFID II Vorgaben.",
            "answer_full": "Beratungspflichten nach MiFID II: Anlegergerechte Beratung (Erfahrung, Ziele prüfen), schriftliche Produktinformation, explizite Risikoaufklärung, Dokumentation des Gesprächs, Offenlegung von Provisionen. Keine konkreten Renditeversprechen erlaubt.",
            "keywords": ["beratung", "mifid", "pflicht", "dokumentation", "risiko"]
        },
        
        # Coaching
        {
            "vertical": "coaching_training",
            "knowledge_type": "best_practice",
            "topic": "Erstkontakt Coaching",
            "question": "Wie gestalte ich den Erstkontakt?",
            "answer_short": "Aktives Zuhören, Ziele klären, Transformation aufzeigen, kostenloses Strategiegespräch anbieten.",
            "answer_full": "Erstkontakt-Framework: 1) Aktiv zuhören und verstehen, 2) Aktuelle Situation klären ('Wo stehst du jetzt?'), 3) Wunschzustand identifizieren ('Wo willst du hin?'), 4) Lücke aufzeigen, 5) Transformation beschreiben (nicht Features), 6) Kostenloses Strategiegespräch anbieten.",
            "keywords": ["coaching", "erstgespräch", "akquise", "transformation"]
        }
    ]
    
    for vk in vertical_knowledge:
        cursor.execute("""
            INSERT INTO la_vertical_knowledge 
            (vertical, knowledge_type, topic, question, answer_short, answer_full, keywords, is_active, language)
            VALUES (%(vertical)s, %(knowledge_type)s, %(topic)s, %(question)s, %(answer_short)s, %(answer_full)s, %(keywords)s, true, 'de')
            ON CONFLICT DO NOTHING
        """, vk)
    
    print(f"   ✅ {len(vertical_knowledge)} Vertical Knowledge Einträge eingefügt")


def main():
    """Führt das Seeding aus."""
    
    print("")
    print("╔════════════════════════════════════════════════════════════════════════════╗")
    print("║  LIVE ASSIST SEED DATA                                                     ║")
    print("╚════════════════════════════════════════════════════════════════════════════╝")
    print("")
    
    try:
        conn = get_connection()
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("🔌 Verbindung hergestellt")
        print("")
        
        seed_quick_facts(cursor)
        seed_objection_responses(cursor)
        seed_vertical_knowledge(cursor)
        
        cursor.close()
        conn.close()
        
        print("")
        print("✅ Seeding abgeschlossen!")
        print("")
        
    except Exception as e:
        print(f"❌ Fehler: {e}")
        return False
    
    return True


if __name__ == "__main__":
    main()

