#!/usr/bin/env python3
"""
Test-Script für die neuen Message Generation Funktionen
"""

from app.ai.system_prompt import build_message_context, MESSAGE_GENERATION_RULES

def test_build_message_context():
    """Test der build_message_context Funktion"""
    print("=== TEST 1: build_message_context Funktion ===\n")

    # Test mit vollständigen Daten
    test_lead = {
        'instagram_handle': 'fitness_guru',
        'bio': 'Personal Trainer & Fitness Coach',
        'interests': 'Fitness, Ernährung, Motivation',
        'company': 'FitLife Studio',
        'follower_count': '15k',
        'recent_posts': 'Workout Routines, Meal Prep'
    }

    context = build_message_context(test_lead)
    print("Test Lead mit vollständigen Daten:")
    print(context)
    print()

    # Test mit minimalen Daten
    minimal_lead = {
        'name': 'Max Mustermann'
    }

    context_minimal = build_message_context(minimal_lead)
    print("Test Lead mit minimalen Daten:")
    print(context_minimal)
    print()

def test_message_rules():
    """Test der MESSAGE_GENERATION_RULES"""
    print("=== TEST 2: MESSAGE_GENERATION_RULES ===\n")

    # Prüfe wichtige Inhalte
    checks = [
        ('3-Satz-Formel', '3-SATZ-FORMEL' in MESSAGE_GENERATION_RULES),
        ('Verbotene Phrasen', 'VERBOTENE PHRASEN' in MESSAGE_GENERATION_RULES),
        ('Plattform-spezifische Regeln', 'PLATTFORM-SPEZIFISCH' in MESSAGE_GENERATION_RULES),
        ('WhatsApp-Regeln', 'WhatsApp:' in MESSAGE_GENERATION_RULES),
        ('Instagram-Regeln', 'Instagram DM:' in MESSAGE_GENERATION_RULES),
        ('Beispiele enthalten', 'BEISPIELE:' in MESSAGE_GENERATION_RULES),
        ('LinkedIn-Style als schlecht markiert', 'LinkedIn-Style' in MESSAGE_GENERATION_RULES),
        ('WhatsApp-Style als gut markiert', 'WhatsApp-Style' in MESSAGE_GENERATION_RULES)
    ]

    for check_name, result in checks:
        status = "✅" if result else "❌"
        print(f"{status} {check_name}: {result}")

    print()

def test_manual_examples():
    """Manuelle Beispiele generieren basierend auf den Regeln"""
    print("=== TEST 3: MANUELLE BEISPIELE ===\n")

    examples = [
        {
            'name': 'Maria',
            'bio': 'Yoga Teacher & Wellness Coach',
            'interests': 'Yoga, Meditation, Healthy Living',
            'platform': 'whatsapp'
        },
        {
            'name': 'Thomas',
            'company': 'Marketing Agentur XYZ',
            'interests': 'Digital Marketing, SEO, Growth Hacking',
            'platform': 'instagram'
        },
        {
            'name': 'Lisa',
            'bio': 'Mama von 2 Kindern, Freelance Designer',
            'interests': 'UI/UX Design, Work-Life-Balance',
            'platform': 'whatsapp'
        }
    ]

    for i, lead in enumerate(examples, 1):
        context = build_message_context(lead)
        print(f"BEISPIEL {i} - {lead['name']} ({lead['platform']}):")
        print(f"Kontext: {context}")

        # Hier könnten wir die generate_opener_message aufrufen,
        # aber da wir keine API haben, zeigen wir nur den Prompt
        print("→ Würde generierte Nachricht erstellen...")
        print()

if __name__ == "__main__":
    print("🚀 TESTING MESSAGE GENERATION OPTIMIZATION\n")

    test_build_message_context()
    test_message_rules()
    test_manual_examples()

    print("✅ IMPLEMENTATION TESTS ABGESCHLOSSEN!")
    print("\nNächste Schritte:")
    print("1. Integration mit AI API für echte Nachrichten-Generierung")
    print("2. Test mit echten Lead-Profilen")
    print("3. Performance-Messung der Response-Qualität")
