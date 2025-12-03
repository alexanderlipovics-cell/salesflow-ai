"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ZINZINO LIVE ASSIST SEED DATA                                             ║
║  Quick Facts, Objection Responses, Vertical Knowledge                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieses Modul enthält Seed-Daten für das Live Assist System,
speziell für Zinzino (Network Marketing / Health).

Usage:
    from backend.app.seeds.zinzino_live_assist_seed import seed_zinzino_live_assist
    seed_zinzino_live_assist(supabase_client, company_id)
"""

from typing import List, Dict, Any, Optional
from supabase import Client


# =============================================================================
# QUICK FACTS
# =============================================================================

ZINZINO_QUICK_FACTS = [
    # USP Facts
    {
        "fact_type": "differentiator",
        "fact_key": "test_based_nutrition",
        "fact_value": "Zinzino ist die einzige Firma, die Ernährung messbar macht - mit Bluttest vor und nach der Einnahme.",
        "fact_short": "Einzige Firma mit Bluttest vor/nach.",
        "use_in_contexts": ["usp_pitch", "opening", "differentiation"],
        "importance": 100,
        "is_key_fact": True,
    },
    {
        "fact_type": "number",
        "fact_key": "balance_improvement_rate",
        "fact_value": "90% aller Nutzer verbessern ihre Omega 6:3 Balance nach 120 Tagen nachweislich.",
        "fact_short": "90% verbessern in 120 Tagen.",
        "use_in_contexts": ["social_proof", "objection_doubt", "closing"],
        "importance": 95,
        "is_key_fact": True,
    },
    {
        "fact_type": "number",
        "fact_key": "customers_tested",
        "fact_value": "Über 1 Million Bluttests weltweit durchgeführt - größte Omega-3 Datenbank der Welt.",
        "fact_short": "1 Million+ Tests, größte Omega-3 Datenbank.",
        "use_in_contexts": ["social_proof", "trust_building"],
        "importance": 90,
        "is_key_fact": True,
    },
    {
        "fact_type": "comparison",
        "fact_key": "average_omega_ratio",
        "fact_value": "Durchschnittliche Omega 6:3 Balance in Europa: 15:1. Optimal wäre 3:1. Die meisten sind massiv im Ungleichgewicht.",
        "fact_short": "Europa 15:1, optimal 3:1 - die meisten sind unbalanciert.",
        "use_in_contexts": ["problem_awareness", "opening"],
        "importance": 85,
        "is_key_fact": True,
    },
    {
        "fact_type": "benefit",
        "fact_key": "silent_inflammation",
        "fact_value": "Ein schlechtes Omega-Verhältnis fördert stille Entzündungen - Ursache für viele chronische Beschwerden.",
        "fact_short": "Schlechte Balance = stille Entzündungen.",
        "use_in_contexts": ["problem_awareness", "health_angle"],
        "importance": 80,
        "is_key_fact": False,
    },
    
    # Product Facts - BalanceOil
    {
        "fact_type": "benefit",
        "fact_key": "balanceoil_polyphenols",
        "fact_value": "BalanceOil+ enthält Polyphenole aus Olivenöl, die die Oxidation des Omega-3 im Körper verhindern.",
        "fact_short": "Polyphenole schützen das Omega-3 im Körper.",
        "use_in_contexts": ["product_detail", "differentiation"],
        "importance": 75,
        "is_key_fact": False,
    },
    {
        "fact_type": "number",
        "fact_key": "balanceoil_studies",
        "fact_value": "Über 30 wissenschaftliche Studien belegen die Wirksamkeit der Zinzino-Produkte.",
        "fact_short": "30+ Studien zur Wirksamkeit.",
        "source": "Zinzino Science",
        "use_in_contexts": ["science", "trust_building", "objection_doubt"],
        "importance": 85,
        "is_key_fact": True,
    },
    {
        "fact_type": "benefit",
        "fact_key": "wild_fish_oil",
        "fact_value": "Zinzino verwendet ausschließlich Wildfischöl aus nachhaltigem Fang - keine Zuchtfische.",
        "fact_short": "100% Wildfisch, keine Zucht.",
        "use_in_contexts": ["quality", "sustainability"],
        "importance": 70,
        "is_key_fact": False,
    },
    
    # Business Facts
    {
        "fact_type": "number",
        "fact_key": "countries_active",
        "fact_value": "Zinzino ist in über 100 Ländern aktiv und eines der am schnellsten wachsenden Health-Tech-Unternehmen Europas.",
        "fact_short": "100+ Länder, schnellstes Wachstum in Europa.",
        "use_in_contexts": ["business_opportunity", "trust_building"],
        "importance": 70,
        "is_key_fact": False,
    },
    {
        "fact_type": "differentiator",
        "fact_key": "subscription_model",
        "fact_value": "Abo-Modell mit automatischer Lieferung alle 30-60-90 Tage. Kein Mindestbestellwert, jederzeit kündbar.",
        "fact_short": "Flexibles Abo, jederzeit kündbar.",
        "use_in_contexts": ["pricing", "objection_commitment"],
        "importance": 65,
        "is_key_fact": False,
    },
    
    # Price Facts
    {
        "fact_type": "comparison",
        "fact_key": "daily_cost",
        "fact_value": "BalanceOil+ kostet etwa 1,50€ pro Tag - weniger als ein Kaffee, aber mit messbarer Wirkung.",
        "fact_short": "1,50€/Tag - weniger als ein Kaffee.",
        "use_in_contexts": ["objection_price", "closing"],
        "importance": 90,
        "is_key_fact": True,
    },
    {
        "fact_type": "benefit",
        "fact_key": "vitamin_d_included",
        "fact_value": "BalanceOil+ enthält bereits Vitamin D3 - kein zusätzliches Supplement nötig.",
        "fact_short": "Vitamin D3 inklusive.",
        "use_in_contexts": ["product_detail", "value"],
        "importance": 60,
        "is_key_fact": False,
    },
]


# =============================================================================
# OBJECTION RESPONSES
# =============================================================================

ZINZINO_OBJECTION_RESPONSES = [
    # PREIS
    {
        "objection_type": "price",
        "objection_keywords": ["zu teuer", "kein budget", "kostet zu viel", "kann mir nicht leisten", "zu viel geld"],
        "objection_example": "Das ist mir zu teuer.",
        "response_short": "Verstehe ich. Aber rechne mal: 1,50€ am Tag - weniger als ein Kaffee. Und du siehst in 120 Tagen schwarz auf weiß, ob's wirkt.",
        "response_full": "Das verstehe ich total. Aber lass uns mal kurz rechnen: Das sind etwa 1,50€ am Tag - weniger als ein Kaffee bei Starbucks. Der Unterschied? Nach 120 Tagen hast du einen Bluttest, der dir schwarz auf weiß zeigt, ob dein Körper sich verbessert hat. 90% sehen eine messbare Verbesserung. Bei welchem anderen Produkt bekommst du so eine Garantie?",
        "response_technique": "reduce_to_daily",
        "follow_up_question": "Was wäre es dir wert, wenn du wüsstest, dass dein Körper optimal versorgt ist?",
    },
    {
        "objection_type": "price",
        "objection_keywords": ["billiger", "günstiger", "amazon", "drogerie", "rossmann", "dm"],
        "objection_example": "Bei Amazon gibt's das billiger.",
        "response_short": "Stimmt, billigere Omega-3 gibt's überall. Aber: Macht jemand einen Bluttest vorher/nachher? Nein. Bei uns weißt du, ob's wirkt.",
        "response_full": "Ja, billigere Omega-3 Kapseln gibt's überall. Aber hier ist der Unterschied: Weißt du bei den Billig-Produkten, ob sie überhaupt wirken? Macht jemand einen Bluttest vorher und nachher? Nein. Bei Zinzino siehst du den Beweis. Und die Qualität - Wildfischöl, keine Zuchtfische, plus Polyphenole aus Olivenöl. Das ist wie der Unterschied zwischen Fast Food und einem guten Restaurant.",
        "response_technique": "compare_value",
        "follow_up_question": "Was ist dir wichtiger: Der günstigste Preis oder zu wissen, dass es wirkt?",
    },
    
    # ZEIT / ÜBERLEGEN
    {
        "objection_type": "think_about_it",
        "objection_keywords": ["überlegen", "drüber schlafen", "später", "nochmal nachdenken", "muss schauen"],
        "objection_example": "Ich muss mir das nochmal überlegen.",
        "response_short": "Klar, versteh ich. Was genau willst du dir überlegen? Vielleicht kann ich dir jetzt schon helfen.",
        "response_full": "Verstehe ich total, ist eine Entscheidung für deine Gesundheit. Was genau möchtest du dir überlegen? Ist es der Preis, die Wirkung, oder etwas anderes? Vielleicht kann ich dir jetzt schon eine Info geben, die dir hilft.",
        "response_technique": "question_back",
        "follow_up_question": "Was müsste passieren, damit du heute Ja sagen könntest?",
    },
    {
        "objection_type": "time",
        "objection_keywords": ["keine zeit", "zu beschäftigt", "stressig", "später"],
        "objection_example": "Ich hab gerade keine Zeit dafür.",
        "response_short": "Genau deshalb! Wenn du gestresst bist, braucht dein Körper das am meisten. 10 Sekunden am Tag - Öl nehmen, fertig.",
        "response_full": "Das höre ich oft. Aber ehrlich: Gerade WEIL du so beschäftigt bist, braucht dein Körper das. Stress verbrennt Omega-3 wie verrückt. Und der Aufwand? 10 Sekunden am Tag - ein Löffel Öl, fertig. Das ist weniger Aufwand als Zähneputzen.",
        "response_technique": "reframe",
        "follow_up_question": "Wie viel Zeit investierst du sonst in deine Gesundheit?",
    },
    
    # ZWEIFEL / SKEPSIS
    {
        "objection_type": "trust",
        "objection_keywords": ["glaub nicht", "skeptisch", "funktioniert nicht", "marketing", "zu schön"],
        "objection_example": "Das klingt zu gut, um wahr zu sein.",
        "response_short": "Verstehe die Skepsis. Deshalb gibt's den Bluttest - du siehst selbst, ob's funktioniert. Kein Versprechen, nur Fakten.",
        "response_full": "Die Skepsis verstehe ich total. Deshalb liebe ich Zinzino: Du musst mir nicht glauben. Du machst einen Bluttest vorher, nimmst 120 Tage das Produkt, machst den Test nochmal - und siehst selbst. Keine Marketing-Versprechen, nur deine eigenen Blutwerte. 90% sehen eine Verbesserung. Das ist Wissenschaft, nicht Wunschdenken.",
        "response_technique": "social_proof",
        "follow_up_question": "Was wäre, wenn du es einfach testen könntest - ohne Risiko?",
    },
    {
        "objection_type": "trust",
        "objection_keywords": ["mlm", "pyramide", "network marketing", "schneeballsystem", "netzwerk"],
        "objection_example": "Das ist doch MLM / Pyramidensystem.",
        "response_short": "Verstehe die Sorge. Aber: Pyramiden haben kein Produkt. Wir haben Bluttests, Studien, echte Ergebnisse. Das Business-Modell ist optional.",
        "response_full": "Das Thema verstehe ich. Aber lass mich kurz erklären: Bei einem Pyramidensystem gibt's kein echtes Produkt, nur Geld das rumgeschoben wird. Bei Zinzino? Echte Produkte, echte Studien, echte Bluttests mit echten Ergebnissen. Die meisten Kunden sind normale Kunden, die nur das Produkt wollen. Das Business-Modell ist komplett optional.",
        "response_technique": "empathize_then_pivot",
        "follow_up_question": None,
    },
    
    # KONKURRENZ
    {
        "objection_type": "competitor",
        "objection_keywords": ["andere firma", "schon was", "nehme bereits", "norsan", "omega-3", "bereits"],
        "objection_example": "Ich nehme schon Omega-3 von einer anderen Firma.",
        "response_short": "Super, dass du auf Omega-3 achtest! Die Frage ist: Weißt du, ob's wirkt? Mach den Test - wenn deine Balance gut ist, brauchst du uns nicht.",
        "response_full": "Super, dass du schon auf Omega-3 achtest! Die Frage ist: Weißt du, ob dein aktuelles Produkt wirklich wirkt? Macht diese Firma einen Bluttest vorher/nachher? Bei Zinzino kannst du das checken. Wenn deine Balance schon optimal ist, brauchst du uns nicht. Aber die meisten sind überrascht, wie schlecht ihre Werte trotz Supplement sind.",
        "response_technique": "question_back",
        "follow_up_question": "Wärst du bereit, deine aktuelle Balance mal zu testen?",
    },
    
    # KEIN BEDARF
    {
        "objection_type": "need",
        "objection_keywords": ["brauch nicht", "gesund", "esse fisch", "ernähre mich gut", "brauch ich nicht"],
        "objection_example": "Ich esse genug Fisch, ich brauch das nicht.",
        "response_short": "Guter Ansatz! Aber wusstest du: Selbst Leute die 3x/Woche Fisch essen, haben oft schlechte Omega-Werte. Der Test zeigt dir, wo du wirklich stehst.",
        "response_full": "Das ist ein super Ansatz! Aber hier ist der Haken: Selbst Menschen, die 3x pro Woche Fisch essen, haben oft eine schlechte Omega-Balance. Warum? Weil auch Zuchtfische heute weniger Omega-3 haben, und weil wir gleichzeitig so viel Omega-6 aus anderen Quellen bekommen. Der Bluttest zeigt dir, wo du wirklich stehst - vielleicht bist du ja die Ausnahme!",
        "response_technique": "reframe",
        "follow_up_question": "Wärst du neugierig, deine tatsächlichen Werte zu sehen?",
    },
    
    # KEIN INTERESSE
    {
        "objection_type": "not_interested",
        "objection_keywords": ["kein interesse", "interessiert mich nicht", "nicht für mich"],
        "objection_example": "Das interessiert mich nicht.",
        "response_short": "Verstehe. Darf ich fragen - was hält dich davon ab? Ist es das Thema Gesundheit generell oder speziell Omega-3?",
        "response_full": "Verstehe, nicht alles ist für jeden. Darf ich nur kurz fragen: Geht's dir um Nahrungsergänzung generell, oder speziell um Omega-3? Manchmal hör ich 'kein Interesse' und eigentlich geht's um was ganz anderes.",
        "response_technique": "question_back",
        "follow_up_question": "Was müsste ein Produkt haben, damit es dich interessiert?",
    },
    
    # ═══════════════════════════════════════════════════════════════════════════
    # NEUE ZINZINO-SPEZIFISCHE OBJECTIONS (v4.0)
    # ═══════════════════════════════════════════════════════════════════════════
    
    # ABO-SKEPSIS
    {
        "objection_type": "commitment",
        "objection_keywords": ["abo", "monatlich", "gebunden", "vertrag", "kündigung", "verpflichtung", "subscription"],
        "objection_example": "Ich will mich nicht an ein Abo binden.",
        "response_short": "Verstehe ich! Aber: Jederzeit kündbar, keine Mindestlaufzeit. Du kannst nach dem ersten Test entscheiden, ob's weiter geht.",
        "response_full": "Das verstehe ich total - niemand will sich festlegen. Aber hier die gute Nachricht: Bei Zinzino gibt's keine Mindestlaufzeit. Du kannst jederzeit kündigen, online, mit einem Klick. Viele machen erstmal nur den Test und schauen dann, wie ihre Werte sind. Kein Druck, kein Kleingedrucktes.",
        "response_technique": "remove_fear",
        "follow_up_question": "Wärst du offen, es einfach mal zu testen - ohne langfristige Verpflichtung?",
    },
    {
        "objection_type": "commitment",
        "objection_keywords": ["120 tage", "4 monate", "lang", "lange", "dauert", "so lange"],
        "objection_example": "120 Tage ist mir zu lang.",
        "response_short": "Verstehe. Aber: Dein Körper braucht Zeit, seine Zellen zu erneuern. Nach 120 Tagen siehst du, ob's wirkt. Wenn nicht - Abo weg, kein Problem.",
        "response_full": "Das höre ich oft. Aber hier der biologische Hintergrund: Deine roten Blutkörperchen leben etwa 120 Tage. Der Test misst die Fettsäuren IN den Zellen - und die können sich erst verändern, wenn sich die Zellen erneuert haben. Das ist also keine Willkür, sondern Biologie. Und wenn nach 120 Tagen nichts besser ist? Dann weißt du Bescheid und kannst kündigen.",
        "response_technique": "educate",
        "follow_up_question": "Macht das Sinn, wenn man's biologisch erklärt?",
    },
    
    # PARTNER/EHEPARTNER ENTSCHEIDUNG
    {
        "objection_type": "authority",
        "objection_keywords": ["partner", "mann", "frau", "ehepartner", "besprechen", "fragen", "abstimmen"],
        "objection_example": "Da muss ich erst meinen Partner/meine Partnerin fragen.",
        "response_short": "Klar, wichtige Entscheidungen bespricht man. Soll ich dir vielleicht Material schicken, das ihr zusammen anschauen könnt?",
        "response_full": "Das finde ich super, dass ihr solche Entscheidungen zusammen trefft. Gerne kann ich dir Material schicken, das die wichtigsten Fakten zusammenfasst. Oder - falls ihr wollt - können wir auch einen kurzen Call zu dritt machen. Dann kann dein/e Partner/in direkt Fragen stellen.",
        "response_technique": "include_decision_maker",
        "follow_up_question": "Wann wäre ein guter Zeitpunkt, um euch beide kurz zu erreichen?",
    },
    
    # GESCHMACK / FISCHIG
    {
        "objection_type": "product",
        "objection_keywords": ["fischig", "geschmack", "schmeckt", "öl", "rülpsen", "aufstoßen", "eklig"],
        "objection_example": "Fischöl schmeckt doch eklig und ich muss davon aufstoßen.",
        "response_short": "Verstehe! Aber BalanceOil+ schmeckt nach Zitrone oder Orange - kein Fischgeschmack. Und durch die Qualität: kein Aufstoßen.",
        "response_full": "Das kenn ich von günstigen Omega-3 Kapseln! Bei Zinzino ist das anders: BalanceOil+ ist mit Zitrone oder Orange aromatisiert - schmeckt frisch, nicht nach Fisch. Und das Aufstoßen? Das passiert bei minderwertigen Produkten, weil das Öl ranzig ist. Bei Zinzino ist das durch die Polyphenole und die frische Verarbeitung kein Thema. Probier's aus - du wirst überrascht sein!",
        "response_technique": "remove_fear",
        "follow_up_question": "Welche Geschmacksrichtung würde dich ansprechen - Zitrone oder Orange?",
    },
    
    # BEREITS GENUG SUPPLEMENTS
    {
        "objection_type": "need",
        "objection_keywords": ["nehme schon", "genug pillen", "zu viele tabletten", "supplement stack", "überdosierung"],
        "objection_example": "Ich nehme schon genug Tabletten, ich will nicht noch mehr.",
        "response_short": "Verstehe! Aber: Mit einem guten Omega-3 kannst du oft ANDERE Supplements reduzieren. Der Test zeigt dir, was du wirklich brauchst.",
        "response_full": "Das verstehe ich total - niemand will eine Apotheke schlucken. Aber hier ist der Clou: Viele nehmen 10 verschiedene Supplements, ohne zu wissen, was sie wirklich brauchen. Der Zinzino-Test zeigt dir genau, wo du stehst. Und ein gutes Omega-Verhältnis hilft dem Körper, andere Nährstoffe besser aufzunehmen. Viele können dadurch sogar Supplements REDUZIEREN.",
        "response_technique": "reframe",
        "follow_up_question": "Wärst du offen, mal zu schauen, was du wirklich brauchst?",
    },
    
    # VEGANER / VEGETARIER
    {
        "objection_type": "product",
        "objection_keywords": ["vegan", "vegetarisch", "kein fisch", "pflanzlich", "tier", "alge"],
        "objection_example": "Ich bin Veganer/Vegetarier, Fischöl kommt nicht in Frage.",
        "response_short": "Verstehe! Es gibt BalanceOil+ Vegan - aus Algenöl, keine Fische, gleiche Wirkung, gleicher Test.",
        "response_full": "Absolut verständlich! Dafür gibt es BalanceOil+ Vegan - komplett pflanzlich, aus Algenöl gewonnen. Keine Fische beteiligt, aber die gleichen Omega-3 Fettsäuren (EPA und DHA). Und der beste Teil: Du kannst den gleichen Bluttest machen und die gleiche Wirkung sehen. Viele Veganer haben übrigens besonders schlechte Omega-3 Werte, weil pflanzliche Quellen schwer umzuwandeln sind.",
        "response_technique": "provide_alternative",
        "follow_up_question": "Wusstest du, dass Zinzino auch eine vegane Option hat?",
    },
    
    # ARZT / MEDIZINISCHER RAT
    {
        "objection_type": "authority",
        "objection_keywords": ["arzt", "doktor", "fragen", "medizinisch", "hausarzt", "empfehlung"],
        "objection_example": "Da muss ich erstmal meinen Arzt fragen.",
        "response_short": "Gute Idee! Viele Ärzte empfehlen Omega-3 sogar. Der Bluttest gibt dir handfeste Daten, die du deinem Arzt zeigen kannst.",
        "response_full": "Absolut, bei Gesundheitsfragen ist der Arzt wichtig. Und hier ist der coole Teil: Der Zinzino-Test gibt dir konkrete Blutwerte - keine vagen Versprechen, sondern Zahlen, die dein Arzt versteht. Viele Ärzte empfehlen Omega-3 sowieso. Mit dem Test hast du Daten, über die ihr reden könnt.",
        "response_technique": "align_with_authority",
        "follow_up_question": "Soll ich dir eine Zusammenfassung der Studien mitgeben, die du deinem Arzt zeigen kannst?",
    },
    
    # SCHNELLERE WIRKUNG ERWARTET
    {
        "objection_type": "trust",
        "objection_keywords": ["schneller", "sofort", "merklich", "spüren", "fühl nichts", "keine wirkung"],
        "objection_example": "Ich will etwas, das schneller wirkt.",
        "response_short": "Verstehe den Wunsch! Aber: Echte Gesundheit braucht Zeit. Schnelle Fixes = meist Marketing. Bei uns: 120 Tage, dann BEWEIS.",
        "response_full": "Das verstehe ich - wir wollen alle schnelle Ergebnisse. Aber Hand aufs Herz: Alles was 'sofort wirkt' ist meist Marketing oder Symptombekämpfung. Echte zelluläre Gesundheit braucht Zeit. Dein Körper erneuert sich über Monate. Bei Zinzino sagst du nach 120 Tagen nicht 'ich fühl mich irgendwie besser' - du SIEHST im Bluttest, dass sich was verändert hat. Das ist der Unterschied zwischen Hoffnung und Beweis.",
        "response_technique": "educate",
        "follow_up_question": "Was ist dir wichtiger: schnelle Gefühle oder bewiesene Ergebnisse?",
    },
    
    # BUSINESS-EINWÄNDE
    {
        "objection_type": "not_interested",
        "objection_keywords": ["kein network", "kein vertrieb", "nicht verkaufen", "business nicht", "kein interesse am geschäft"],
        "objection_example": "Das Business interessiert mich nicht, ich will nicht verkaufen.",
        "response_short": "Total okay! 80% unserer Kunden sind reine Produktkunden. Du musst gar nichts verkaufen - nur auf deine Gesundheit achten.",
        "response_full": "Absolut okay - das Business ist komplett optional. Tatsächlich sind über 80% unserer Kunden reine Produktkunden, die einfach nur auf ihre Gesundheit achten wollen. Du musst niemandem was verkaufen, niemanden anwerben. Wenn du irgendwann mal jemandem davon erzählst und der interessiert ist - cool, dann gibt's einen Bonus. Wenn nicht - auch gut. Kein Druck.",
        "response_technique": "remove_pressure",
        "follow_up_question": "Ist es okay, wenn wir uns erstmal nur aufs Produkt konzentrieren?",
    },
    {
        "objection_type": "competitor",
        "objection_keywords": ["norsan", "omega 3 zone", "nordic naturals", "dr. budwig", "andere marke"],
        "objection_example": "Ich nehme schon Norsan/Nordic Naturals.",
        "response_short": "Super Marken! Aber: Machen die einen Bluttest? Weißt du, ob's wirkt? Bei uns siehst du den Beweis.",
        "response_full": "Das sind solide Marken, keine Frage! Aber hier ist meine Frage: Weißt du wirklich, ob das Produkt bei DIR wirkt? Machen die einen Bluttest vorher und nachher? Bei Zinzino siehst du schwarz auf weiß, wie sich deine Werte verändern. Viele die von anderen Marken kommen, sind überrascht, dass ihre Balance trotz jahrelanger Einnahme noch schlecht ist.",
        "response_technique": "question_back",
        "follow_up_question": "Wärst du neugierig zu sehen, wie gut dein aktuelles Produkt wirklich wirkt?",
    },
]


# =============================================================================
# VERTICAL KNOWLEDGE - HEALTH/SUPPLEMENTS
# =============================================================================

HEALTH_VERTICAL_KNOWLEDGE = [
    {
        "vertical": "health_supplements",
        "knowledge_type": "industry_fact",
        "topic": "Omega-3 Mangel",
        "question": "Wie verbreitet ist Omega-3 Mangel?",
        "answer_short": "97% der Westeuropäer haben suboptimale Omega-3 Werte. Fast niemand ist optimal versorgt.",
        "answer_full": "Studien zeigen, dass 97% der Menschen in Westeuropa suboptimale Omega-3 Werte haben. Das liegt an unserer modernen Ernährung mit viel Omega-6 (aus Pflanzenölen, verarbeiteten Lebensmitteln) und wenig fettem Fisch. Ein optimales Verhältnis von 3:1 erreichen die wenigsten - der Durchschnitt liegt bei 15:1 oder schlechter.",
        "keywords": ["omega-3", "mangel", "omega-6", "verhältnis", "balance"],
    },
    {
        "vertical": "health_supplements",
        "knowledge_type": "terminology",
        "topic": "Omega 6:3 Verhältnis",
        "question": "Was bedeutet das Omega 6:3 Verhältnis?",
        "answer_short": "Verhältnis von entzündungsfördernden (Omega-6) zu entzündungshemmenden (Omega-3) Fettsäuren. Optimal: 3:1.",
        "answer_full": "Das Omega 6:3 Verhältnis zeigt das Gleichgewicht zwischen entzündungsfördernden Omega-6 Fettsäuren und entzündungshemmenden Omega-3 Fettsäuren im Körper. Beide sind wichtig, aber das Verhältnis sollte bei etwa 3:1 liegen. Bei den meisten Menschen ist es 15:1 oder höher - das kann chronische 'stille' Entzündungen im Körper fördern.",
        "keywords": ["omega", "verhältnis", "entzündung", "balance", "fettsäuren"],
    },
    {
        "vertical": "health_supplements",
        "knowledge_type": "faq",
        "topic": "Stille Entzündungen",
        "question": "Was sind stille Entzündungen?",
        "answer_short": "Chronische, niedriggradige Entzündungen ohne Symptome. Werden mit verschiedenen Beschwerden in Verbindung gebracht.",
        "answer_full": "Stille Entzündungen (silent inflammation) sind chronische, niedriggradige Entzündungsprozesse im Körper, die keine spürbaren Symptome verursachen. Sie werden wissenschaftlich mit vielen chronischen Beschwerden in Verbindung gebracht. Ein gutes Omega-Verhältnis kann dazu beitragen, diese Entzündungen zu reduzieren.",
        "keywords": ["entzündung", "silent inflammation", "chronisch"],
    },
    {
        "vertical": "health_supplements",
        "knowledge_type": "faq",
        "topic": "EPA und DHA",
        "question": "Was sind EPA und DHA?",
        "answer_short": "Die wichtigsten Omega-3 Fettsäuren. EPA wirkt entzündungshemmend, DHA ist wichtig fürs Gehirn.",
        "answer_full": "EPA (Eicosapentaensäure) und DHA (Docosahexaensäure) sind die zwei wichtigsten Omega-3 Fettsäuren. EPA hat vor allem entzündungshemmende Eigenschaften, während DHA besonders wichtig für Gehirn und Sehfunktion ist. Der Körper kann sie nur begrenzt aus pflanzlichen Omega-3 Quellen (ALA) herstellen.",
        "keywords": ["epa", "dha", "omega-3", "fettsäuren", "gehirn"],
    },
    {
        "vertical": "health_supplements",
        "knowledge_type": "regulation",
        "topic": "Health Claims Verordnung",
        "question": "Was darf man über Nahrungsergänzungsmittel sagen?",
        "answer_short": "Nur zugelassene Health Claims. Keine Heilversprechen, keine Krankheitsbehauptungen.",
        "answer_full": "In der EU regelt die Health Claims Verordnung (EG Nr. 1924/2006), welche Aussagen über Lebensmittel und Nahrungsergänzungsmittel gemacht werden dürfen. Erlaubt sind nur zugelassene Health Claims wie 'trägt zur normalen Herzfunktion bei'. Verboten sind Heilversprechen und Behauptungen, Krankheiten zu heilen oder zu verhindern.",
        "keywords": ["health claims", "verordnung", "erlaubt", "verboten", "werbung"],
    },
    {
        "vertical": "network_marketing",
        "knowledge_type": "regulation",
        "topic": "MLM vs Pyramide",
        "question": "Was ist der Unterschied zwischen MLM und Pyramidensystem?",
        "answer_short": "MLM hat echte Produkte und Endkunden. Pyramiden basieren nur auf Rekrutierung ohne echten Produktwert.",
        "answer_full": "Bei legitimem Network Marketing (MLM) steht ein echtes Produkt mit Endkundenwert im Mittelpunkt. Einkommen kommt primär aus Produktverkäufen. Bei illegalen Pyramidensystemen gibt es kein werthaltiges Produkt, Geld wird nur durch Rekrutierung generiert. Der Fokus liegt auf dem Anwerben neuer Teilnehmer statt auf Produktverkauf.",
        "keywords": ["mlm", "pyramide", "network marketing", "legal", "illegal"],
    },
]


# =============================================================================
# SEED FUNCTION
# =============================================================================

def seed_zinzino_live_assist(
    db: Client,
    company_id: Optional[str] = None,
) -> Dict[str, int]:
    """
    Seed Zinzino Live Assist Data.
    
    Args:
        db: Supabase Client
        company_id: Optional Company ID (wenn None, werden Daten ohne Company erstellt)
    
    Returns:
        Dict mit Anzahl der erstellten Einträge
    """
    
    results = {
        "quick_facts": 0,
        "objection_responses": 0,
        "vertical_knowledge": 0,
    }
    
    # Seed Quick Facts
    for fact in ZINZINO_QUICK_FACTS:
        try:
            data = {
                "company_id": company_id,
                "vertical": "network_marketing",
                "fact_type": fact["fact_type"],
                "fact_key": fact["fact_key"],
                "fact_value": fact["fact_value"],
                "fact_short": fact.get("fact_short"),
                "source": fact.get("source"),
                "use_in_contexts": fact.get("use_in_contexts", []),
                "importance": fact.get("importance", 50),
                "is_key_fact": fact.get("is_key_fact", False),
                "language": "de",
            }
            db.table("quick_facts").insert(data).execute()
            results["quick_facts"] += 1
        except Exception as e:
            print(f"Error seeding quick fact {fact['fact_key']}: {e}")
    
    # Seed Objection Responses
    for response in ZINZINO_OBJECTION_RESPONSES:
        try:
            data = {
                "company_id": company_id,
                "vertical": "network_marketing",
                "objection_type": response["objection_type"],
                "objection_keywords": response.get("objection_keywords", []),
                "objection_example": response.get("objection_example"),
                "response_short": response["response_short"],
                "response_full": response.get("response_full"),
                "response_technique": response.get("response_technique"),
                "follow_up_question": response.get("follow_up_question"),
                "source_type": "system",
                "language": "de",
            }
            db.table("objection_responses").insert(data).execute()
            results["objection_responses"] += 1
        except Exception as e:
            print(f"Error seeding objection response {response['objection_type']}: {e}")
    
    # Seed Vertical Knowledge
    for knowledge in HEALTH_VERTICAL_KNOWLEDGE:
        try:
            data = {
                "vertical": knowledge["vertical"],
                "company_id": None,  # General knowledge
                "knowledge_type": knowledge["knowledge_type"],
                "topic": knowledge["topic"],
                "question": knowledge.get("question"),
                "answer_short": knowledge["answer_short"],
                "answer_full": knowledge.get("answer_full"),
                "keywords": knowledge.get("keywords", []),
                "language": "de",
            }
            db.table("vertical_knowledge").insert(data).execute()
            results["vertical_knowledge"] += 1
        except Exception as e:
            print(f"Error seeding vertical knowledge {knowledge['topic']}: {e}")
    
    print(f"Seeded: {results}")
    return results


def seed_additional_verticals(db: Client) -> Dict[str, int]:
    """
    Seed additional vertical knowledge for other industries.
    """
    
    additional_knowledge = [
        # Kaffee-Vertrieb
        {
            "vertical": "coffee",
            "knowledge_type": "terminology",
            "topic": "Arabica vs Robusta",
            "question": "Was ist der Unterschied zwischen Arabica und Robusta?",
            "answer_short": "Arabica: mild, fruchtig, 60% Weltmarkt. Robusta: kräftig, bitter, mehr Koffein.",
            "answer_full": "Arabica-Bohnen machen etwa 60% der Weltproduktion aus. Sie sind milder, haben fruchtige Noten und weniger Koffein. Robusta ist kräftiger, bitterer, hat fast doppelt so viel Koffein und ist robuster im Anbau.",
            "keywords": ["arabica", "robusta", "bohnen", "unterschied"],
        },
        {
            "vertical": "coffee",
            "knowledge_type": "faq",
            "topic": "Röstgrad Bedeutung",
            "question": "Was bedeuten die verschiedenen Röstgrade?",
            "answer_short": "Hell: fruchtig, sauer. Mittel: ausgewogen. Dunkel: bitter, schokoladig, weniger Koffein.",
            "answer_full": "Helle Röstung bewahrt die Säure und Fruchtigkeit der Bohne. Mittlere Röstung ist ausgewogen. Dunkle Röstung bringt Bitterkeit und Schokonoten, reduziert aber tatsächlich den Koffeingehalt.",
            "keywords": ["röstung", "röstgrad", "hell", "dunkel", "mittel"],
        },
        
        # Immobilien
        {
            "vertical": "real_estate",
            "knowledge_type": "regulation",
            "topic": "Provision Käufer/Verkäufer",
            "question": "Wer zahlt die Maklerprovision?",
            "answer_short": "Seit 2020: Teilung 50/50 zwischen Käufer und Verkäufer. Max 3,57% pro Seite (inkl. MwSt).",
            "answer_full": "Seit dem neuen Maklergesetz 2020 wird die Provision in Deutschland geteilt. Der Verkäufer muss mindestens so viel zahlen wie der Käufer. Üblich sind 3,57% pro Seite (3% + MwSt). In einigen Bundesländern gibt es abweichende Regelungen.",
            "keywords": ["provision", "makler", "käufer", "verkäufer", "teilung"],
        },
        {
            "vertical": "real_estate",
            "knowledge_type": "market_data",
            "topic": "Immobilienpreise Entwicklung",
            "question": "Wie haben sich die Immobilienpreise entwickelt?",
            "answer_short": "2010-2022: Starker Anstieg. Seit 2023: Korrektur von 5-15% je nach Region.",
            "answer_full": "Von 2010 bis 2022 stiegen die Immobilienpreise in Deutschland um durchschnittlich 80-100%. Seit 2023 gibt es eine Korrektur durch steigende Zinsen. Je nach Region sind die Preise um 5-15% gefallen. Experten erwarten eine Stabilisierung auf dem aktuellen Niveau.",
            "keywords": ["preise", "entwicklung", "korrektur", "zinsen"],
        },
        
        # Finanzvertrieb
        {
            "vertical": "finance",
            "knowledge_type": "regulation",
            "topic": "Beratungspflicht",
            "question": "Was muss bei der Finanzberatung dokumentiert werden?",
            "answer_short": "Beratungsprotokoll Pflicht. Eignungstest, Risikoaufklärung, Provisionsoffenlegung.",
            "answer_full": "Jede Finanzberatung muss dokumentiert werden: Eignungstest der Kundenbedürfnisse, Risikoaufklärung, alle Provisionen offenlegen. Der Kunde muss das Protokoll erhalten. Verstöße können zu Haftung und BaFin-Sanktionen führen.",
            "keywords": ["beratungsprotokoll", "dokumentation", "pflicht", "provision"],
        },
    ]
    
    results = {"vertical_knowledge": 0}
    
    for knowledge in additional_knowledge:
        try:
            data = {
                "vertical": knowledge["vertical"],
                "company_id": None,
                "knowledge_type": knowledge["knowledge_type"],
                "topic": knowledge["topic"],
                "question": knowledge.get("question"),
                "answer_short": knowledge["answer_short"],
                "answer_full": knowledge.get("answer_full"),
                "keywords": knowledge.get("keywords", []),
                "language": "de",
            }
            db.table("vertical_knowledge").insert(data).execute()
            results["vertical_knowledge"] += 1
        except Exception as e:
            print(f"Error seeding vertical knowledge {knowledge['topic']}: {e}")
    
    return results


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "ZINZINO_QUICK_FACTS",
    "ZINZINO_OBJECTION_RESPONSES",
    "HEALTH_VERTICAL_KNOWLEDGE",
    "seed_zinzino_live_assist",
    "seed_additional_verticals",
]

