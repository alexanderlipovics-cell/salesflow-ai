"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ZINZINO DEMO-CASE TEST                                                    ║
║  Testet Live Assist mit echten Zinzino Szenarien                           ║
╚════════════════════════════════════════════════════════════════════════════╝

Testet:
1. Intent Detection mit Zinzino-typischen Anfragen
2. Emotion Analysis mit typischen Kontakt-Stimmungen
3. Objection Matching mit Zinzino Einwänden
4. Tone Adaptation für verschiedene Situationen
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.live_assist.intent_detection import detect_intent
from app.services.live_assist.emotion import analyze_emotion, get_tone_instruction

# Import Zinzino Data
from app.seeds.zinzino_live_assist_seed import (
    ZINZINO_QUICK_FACTS,
    ZINZINO_OBJECTION_RESPONSES,
)


def test_zinzino_demo():
    """Führt alle Zinzino Demo-Tests durch."""
    
    print("=" * 70)
    print("🧪 ZINZINO DEMO-CASE TEST")
    print("=" * 70)
    
    # Test 1: Intent Detection
    print("\n" + "=" * 70)
    print("📋 TEST 1: Intent Detection mit Zinzino-Anfragen")
    print("=" * 70)
    test_intent_detection()
    
    # Test 2: Emotion Analysis
    print("\n" + "=" * 70)
    print("📋 TEST 2: Emotion Analysis mit typischen Kontakten")
    print("=" * 70)
    test_emotion_analysis()
    
    # Test 3: Objection Matching
    print("\n" + "=" * 70)
    print("📋 TEST 3: Objection Matching")
    print("=" * 70)
    test_objection_matching()
    
    # Test 4: End-to-End Scenario
    print("\n" + "=" * 70)
    print("📋 TEST 4: End-to-End Szenario")
    print("=" * 70)
    test_e2e_scenario()
    
    print("\n" + "=" * 70)
    print("✅ ALLE TESTS ABGESCHLOSSEN")
    print("=" * 70)


def test_intent_detection():
    """Testet Intent Detection mit Zinzino-typischen Anfragen."""
    
    test_cases = [
        # (Query, Expected Intent Category)
        ("Warum sollte ich Zinzino statt andere Omega-3 nehmen?", "usp"),
        ("Das ist mir zu teuer, 50€ im Monat für Öl?", "objection"),
        ("Gib mir mal die wichtigsten Fakten zu BalanceOil", "facts"),
        ("Wie viele Studien gibt es dazu?", "science"),
        ("Mein Kunde sagt das klingt nach MLM Abzocke", "objection"),
        ("Was genau ist der Omega-3 Index?", "product_info"),
        ("Wie läuft so ein Bluttest ab?", "product_info"),
        ("Was unterscheidet Zinzino von Norsan?", "comparison"),
        ("Erzähl mir die Gründer-Story", "story"),
        ("Wie viel kostet das pro Tag?", "pricing"),
    ]
    
    for query, expected_category in test_cases:
        result = detect_intent(query)
        intent = result.intent
        confidence = result.confidence
        
        # Simple category check
        is_correct = _matches_category(intent, expected_category)
        status = "✅" if is_correct else "⚠️"
        
        print(f"\n{status} Query: \"{query[:50]}...\"")
        print(f"   → Intent: {intent} (conf: {confidence:.2f})")
        print(f"   → Erwartet: {expected_category}")


def _matches_category(intent: str, category: str) -> bool:
    """Prüft ob Intent zur Kategorie passt."""
    mapping = {
        "usp": ["usp", "differentiation"],
        "objection": ["objection", "price", "mlm_skepticism"],
        "facts": ["facts", "quick_answer"],
        "science": ["science", "facts"],
        "product_info": ["product_info", "quick_answer"],
        "comparison": ["comparison", "differentiation"],
        "story": ["story", "quick_answer"],
        "pricing": ["pricing", "price"],
    }
    return intent.lower() in mapping.get(category, [category])


def test_emotion_analysis():
    """Testet Emotion Analysis mit typischen Kontakt-Stimmungen."""
    
    test_cases = [
        # (Query, Expected Mood, Expected Decision)
        (
            "Ich bin gerade total im Stress, hab keine Zeit für sowas",
            "gestresst",
            "on_hold"
        ),
        (
            "Das klingt zu gut um wahr zu sein, ich bin skeptisch",
            "skeptisch",
            "on_hold"
        ),
        (
            "Mega interessant! Wann kann ich das bestellen?",
            "positiv",
            "close_to_yes"
        ),
        (
            "Muss ich erstmal drüber nachdenken",
            "neutral",
            "on_hold"
        ),
        (
            "Nein danke, das ist nichts für mich",
            "neutral",
            "close_to_no"
        ),
        (
            "Das MLM-Modell macht mich misstrauisch",
            "skeptisch",
            "on_hold"
        ),
    ]
    
    for query, expected_mood, expected_decision in test_cases:
        result = analyze_emotion(query, vertical="network_marketing")
        
        mood_ok = result.contact_mood == expected_mood
        decision_ok = result.decision_tendency == expected_decision
        status = "✅" if (mood_ok and decision_ok) else "⚠️"
        
        print(f"\n{status} Query: \"{query[:50]}\"")
        print(f"   → Mood: {result.contact_mood} (erw: {expected_mood}) {'✓' if mood_ok else '✗'}")
        print(f"   → Decision: {result.decision_tendency} (erw: {expected_decision}) {'✓' if decision_ok else '✗'}")
        print(f"   → Tone Hint: {result.tone_hint}")
        print(f"   → Engagement: {result.engagement_level}/5")


def test_objection_matching():
    """Testet ob Einwände korrekt erkannt werden."""
    
    # Zinzino-typische Einwände
    test_objections = [
        ("Das ist mir zu teuer", "price"),
        ("Bei Amazon gibt's das billiger", "price"),
        ("Ich muss drüber nachdenken", "think_about_it"),
        ("Hab keine Zeit", "time"),
        ("Das klingt nach MLM Betrug", "trust"),
        ("Ich nehme schon Omega-3 von Norsan", "competitor"),
        ("Brauch ich nicht, ich esse Fisch", "need"),
        ("Interessiert mich nicht", "not_interested"),
    ]
    
    for query, expected_type in test_objections:
        result = detect_intent(query)
        
        # Prüfe ob Objection erkannt
        is_objection = result.intent == "objection"
        objection_type = result.objection_type or "unknown"
        
        type_ok = objection_type == expected_type or is_objection
        status = "✅" if type_ok else "⚠️"
        
        print(f"\n{status} \"{query}\"")
        print(f"   → Erkannt als: {result.intent} / {objection_type}")
        print(f"   → Erwartet: objection / {expected_type}")
        
        # Zeige passende Antwort aus Seed-Data
        matching_response = _find_matching_response(expected_type)
        if matching_response:
            print(f"   → Empfohlene Antwort: {matching_response['response_short'][:60]}...")


def _find_matching_response(objection_type: str) -> dict:
    """Findet passende Antwort aus Zinzino Seed Data."""
    for response in ZINZINO_OBJECTION_RESPONSES:
        if response["objection_type"] == objection_type:
            return response
    return None


def test_e2e_scenario():
    """Testet ein komplettes Gespräch-Szenario."""
    
    print("\n🎭 SZENARIO: Skeptischer Interessent mit Preis-Einwand")
    print("-" * 50)
    
    conversation = [
        {
            "role": "lead",
            "message": "Das klingt ja alles ganz nett, aber ehrlich gesagt bin ich skeptisch. 50€ im Monat für Fischöl?",
        },
        {
            "role": "user_asks",
            "message": "Kunde sagt zu teuer und ist skeptisch",
        },
    ]
    
    for turn in conversation:
        print(f"\n{'👤' if turn['role'] == 'lead' else '🎯'} {turn['role'].upper()}: \"{turn['message']}\"")
        
        if turn["role"] == "user_asks":
            # Analysiere
            emotion = analyze_emotion(
                turn["message"], 
                objection_type="price",
                vertical="network_marketing"
            )
            intent = detect_intent(turn["message"])
            
            print(f"\n📊 CHIEF ANALYSE:")
            print(f"   • Intent: {intent.intent} (conf: {intent.confidence:.2f})")
            print(f"   • Mood: {emotion.contact_mood}")
            print(f"   • Decision: {emotion.decision_tendency}")
            print(f"   • Empfohlener Ton: {emotion.tone_hint}")
            
            # Zeige Ton-Anweisung
            tone_instruction = get_tone_instruction(emotion.tone_hint)
            print(f"\n📝 TON-ANWEISUNG:")
            for line in tone_instruction.strip().split("\n"):
                print(f"   {line}")
            
            # Finde passende Antwort
            response = _find_matching_response("price")
            if response:
                print(f"\n💬 EMPFOHLENE ANTWORT:")
                print(f"   \"{response['response_short']}\"")
                print(f"\n   Technik: {response.get('response_technique', 'N/A')}")
                if response.get("follow_up_question"):
                    print(f"   Follow-up: \"{response['follow_up_question']}\"")
    
    print("\n" + "-" * 50)
    print("✅ Szenario abgeschlossen!")


def show_zinzino_data_summary():
    """Zeigt Zusammenfassung der Zinzino Seed-Daten."""
    
    print("\n" + "=" * 70)
    print("📦 ZINZINO SEED DATA ZUSAMMENFASSUNG")
    print("=" * 70)
    
    print(f"\n📊 Quick Facts: {len(ZINZINO_QUICK_FACTS)} Einträge")
    key_facts = [f for f in ZINZINO_QUICK_FACTS if f.get("is_key_fact")]
    print(f"   → Davon Key Facts: {len(key_facts)}")
    for fact in key_facts[:3]:
        print(f"   • {fact['fact_short']}")
    
    print(f"\n💬 Objection Responses: {len(ZINZINO_OBJECTION_RESPONSES)} Einträge")
    by_type = {}
    for r in ZINZINO_OBJECTION_RESPONSES:
        t = r["objection_type"]
        by_type[t] = by_type.get(t, 0) + 1
    for t, count in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"   • {t}: {count}")


if __name__ == "__main__":
    test_zinzino_demo()
    show_zinzino_data_summary()

