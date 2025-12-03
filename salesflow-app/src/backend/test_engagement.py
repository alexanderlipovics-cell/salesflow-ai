"""
Test-Script für das verbesserte Engagement Level Detection.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.live_assist.emotion import (
    analyze_emotion,
    get_engagement_recommendation,
    ENGAGEMENT_DESCRIPTORS
)

# Test-Cases mit erwartetem Engagement Level
TEST_CASES = [
    # (Query, Expected Engagement Range, Description)
    
    # Low Engagement (1-2)
    ("ok", (1, 2), "Einsilbig"),
    ("ja", (1, 2), "Minimal"),
    ("nee passt schon", (1, 2), "Kurz abweisend"),
    ("weiß nicht, ist mir egal", (1, 2), "Desinteresse"),
    
    # Medium Engagement (3)
    ("Was kostet das?", (2, 4), "Einfache Frage"),
    ("Erzähl mir mehr", (3, 4), "Interesse zeigend"),
    ("Interessant, aber ich muss drüber nachdenken", (2, 3), "Vorsichtig interessiert"),
    
    # High Engagement (4-5)
    ("Das klingt super interessant! Wie funktioniert das genau? Gibt es da Studien?", (4, 5), "Mehrere Fragen, begeistert"),
    ("Wow, das ist ja krass! Wann kann ich das bestellen? Was kostet es?", (4, 5), "Begeistert, kaufbereit"),
    ("Ich habe mir das genau angeschaut und habe noch ein paar konkrete Fragen zu den Inhaltsstoffen und der Dosierung", (4, 5), "Detailliert, vorbereitet"),
    
    # Edge Cases
    ("Ich bin skeptisch, aber zeig mir die Beweise und ich überleg's mir", (3, 4), "Skeptisch aber offen"),
    ("Sorry hab gerade mega stress, können wir das später machen?", (1, 2), "Gestresst, abweisend"),
    ("!!!!! DAS IST JA MEGA!!!! Will ich haben!!!!!", (4, 5), "Emotional, begeistert"),
]


def test_engagement_detection():
    print("=" * 70)
    print("ENGAGEMENT LEVEL DETECTION TEST")
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    for query, (expected_min, expected_max), description in TEST_CASES:
        result = analyze_emotion(query)
        engagement = result.engagement_level
        
        in_range = expected_min <= engagement <= expected_max
        status = "PASS" if in_range else "FAIL"
        
        if in_range:
            passed += 1
        else:
            failed += 1
        
        print(f"\n[{status}] {description}")
        print(f"    Query: \"{query[:60]}{'...' if len(query) > 60 else ''}\"")
        print(f"    Engagement: {engagement} (erwartet: {expected_min}-{expected_max})")
        print(f"    Mood: {result.contact_mood} | Decision: {result.decision_tendency}")
        print(f"    Recommendation: {get_engagement_recommendation(engagement)}")
    
    print("\n" + "=" * 70)
    print(f"ERGEBNIS: {passed}/{passed+failed} Tests bestanden ({passed/(passed+failed)*100:.0f}%)")
    print("=" * 70)
    
    # Zeige Engagement Level Descriptors
    print("\n📊 ENGAGEMENT LEVEL DESCRIPTORS:")
    for level, info in ENGAGEMENT_DESCRIPTORS.items():
        print(f"\n  Level {level}: {info['label']}")
        print(f"    → {info['description']}")
        print(f"    → Empfehlung: {info['recommendation']}")


if __name__ == "__main__":
    test_engagement_detection()

