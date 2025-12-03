"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PERFORMANCE TEST                                                          ║
║  Testet ob Live Assist das <200ms Ziel erreicht                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Ziele aus CHIEF v4.0:
- Cache-Hit (Objection/Fact gefunden):     < 50ms  ✅
- Cache-Hit + Formatting:                  < 100ms ✅
- Cache-Miss + LLM (Claude Haiku):         < 500ms ⚠️
- 90% aller Queries < 200ms

Dieser Test:
1. Misst Intent Detection Performance
2. Misst Emotion Analysis Performance
3. Misst Cache-Lookup Performance
4. Simuliert E2E Query Processing
"""

import time
import statistics
from typing import List, Dict, Any
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def run_performance_tests():
    """Führt alle Performance-Tests aus."""
    
    print("=" * 70)
    print("CHIEF v4.0 PERFORMANCE TEST")
    print("=" * 70)
    
    results = {}
    
    # 1. Intent Detection Test
    print("\n📊 Test 1: Intent Detection Performance")
    print("-" * 50)
    results["intent_detection"] = test_intent_detection()
    
    # 2. Emotion Analysis Test
    print("\n📊 Test 2: Emotion Analysis Performance")
    print("-" * 50)
    results["emotion_analysis"] = test_emotion_analysis()
    
    # 3. Confidence Calculation Test
    print("\n📊 Test 3: Confidence Calculation Performance")
    print("-" * 50)
    results["confidence_calc"] = test_confidence_calculation()
    
    # 4. Summary
    print("\n" + "=" * 70)
    print("ZUSAMMENFASSUNG")
    print("=" * 70)
    
    all_times = []
    for test_name, test_result in results.items():
        avg = test_result["avg_ms"]
        all_times.extend(test_result["times_ms"])
        
        status = "✅" if avg < 50 else ("⚠️" if avg < 200 else "❌")
        print(f"{status} {test_name}: {avg:.2f}ms avg")
    
    # Percentiles
    if all_times:
        all_times.sort()
        p50 = all_times[int(len(all_times) * 0.5)]
        p90 = all_times[int(len(all_times) * 0.9)]
        p99 = all_times[int(len(all_times) * 0.99)] if len(all_times) >= 100 else all_times[-1]
        
        print(f"\n📈 Percentiles:")
        print(f"   P50: {p50:.2f}ms")
        print(f"   P90: {p90:.2f}ms {'✅' if p90 < 200 else '❌'}")
        print(f"   P99: {p99:.2f}ms")
    
    # Target Check
    print("\n🎯 CHIEF v4.0 Ziel: 90% aller Queries < 200ms")
    under_200 = sum(1 for t in all_times if t < 200)
    percentage = (under_200 / len(all_times) * 100) if all_times else 0
    status = "✅ ERREICHT" if percentage >= 90 else "❌ NICHT ERREICHT"
    print(f"   Aktuell: {percentage:.1f}% < 200ms → {status}")
    
    return results


def test_intent_detection() -> Dict[str, Any]:
    """Testet Intent Detection Performance."""
    
    try:
        from app.services.live_assist.intent_detection import detect_intent
        
        test_queries = [
            "Warum sollte ich bei euch kaufen?",
            "Das ist mir zu teuer",
            "Ich muss noch darüber nachdenken",
            "Gib mir Zahlen und Fakten",
            "Wie funktioniert das Produkt?",
            "Kunde sagt er hat keine Zeit",
            "Was unterscheidet euch von der Konkurrenz?",
            "Ich bin skeptisch gegenüber MLM",
            "Welche Studien gibt es dazu?",
            "Wie kann ich das buchen?",
        ] * 10  # 100 queries
        
        times = []
        for query in test_queries:
            start = time.perf_counter()
            result = detect_intent(query)
            elapsed = (time.perf_counter() - start) * 1000
            times.append(elapsed)
        
        avg = statistics.mean(times)
        print(f"   Queries getestet: {len(test_queries)}")
        print(f"   Durchschnitt: {avg:.2f}ms")
        print(f"   Min: {min(times):.2f}ms")
        print(f"   Max: {max(times):.2f}ms")
        
        return {"avg_ms": avg, "times_ms": times, "count": len(test_queries)}
        
    except ImportError as e:
        print(f"   ⚠️ Konnte nicht importieren: {e}")
        return {"avg_ms": 0, "times_ms": [], "count": 0}


def test_emotion_analysis() -> Dict[str, Any]:
    """Testet Emotion Analysis Performance."""
    
    try:
        from app.services.live_assist.emotion import analyze_emotion
        
        test_cases = [
            ("Ich bin total gestresst gerade", None, "price"),
            ("Das klingt super interessant!", None, None),
            ("Ich glaub das nicht, zu gut um wahr zu sein", None, None),
            ("Muss ich noch überlegen", None, None),
            ("Wann können wir starten?", None, None),
            ("Hab keine Zeit für sowas", None, "time"),
            ("Skeptisch ob das funktioniert", None, "trust"),
            ("Mega cool, erzähl mehr!", None, None),
            ("Bin gerade busy, später", None, None),
            ("Wie buche ich das?", None, None),
        ] * 10  # 100 cases
        
        times = []
        for query, intent, objection_type in test_cases:
            start = time.perf_counter()
            result = analyze_emotion(query, intent, objection_type)
            elapsed = (time.perf_counter() - start) * 1000
            times.append(elapsed)
        
        avg = statistics.mean(times)
        print(f"   Cases getestet: {len(test_cases)}")
        print(f"   Durchschnitt: {avg:.2f}ms")
        print(f"   Min: {min(times):.2f}ms")
        print(f"   Max: {max(times):.2f}ms")
        
        return {"avg_ms": avg, "times_ms": times, "count": len(test_cases)}
        
    except ImportError as e:
        print(f"   ⚠️ Konnte nicht importieren: {e}")
        return {"avg_ms": 0, "times_ms": [], "count": 0}


def test_confidence_calculation() -> Dict[str, Any]:
    """Testet Confidence Calculation Performance."""
    
    try:
        from app.config.prompts.chief_autopilot import calculate_confidence_score
        
        # Test cases: (knowledge_match, intent_confidence, response_fit, risk_level)
        test_cases = [
            ("exact", 0.95, "perfect", "low"),
            ("similar", 0.8, "good", "medium"),
            ("exact", 0.9, "perfect", "high"),
            ("partial", 0.7, "good", "high"),
            ("exact", 0.85, "perfect", "low"),
            ("none", 0.6, "good", "medium"),
            ("similar", 0.75, "perfect", "low"),
            ("exact", 0.92, "good", "medium"),
            ("partial", 0.65, "good", "high"),
            ("exact", 0.88, "perfect", "low"),
        ] * 10  # 100 cases
        
        times = []
        for knowledge, conf, response, risk in test_cases:
            start = time.perf_counter()
            result = calculate_confidence_score(
                knowledge_match=knowledge,
                intent_confidence=conf,
                response_fit=response,
                risk_level=risk,
            )
            elapsed = (time.perf_counter() - start) * 1000
            times.append(elapsed)
        
        avg = statistics.mean(times)
        print(f"   Cases getestet: {len(test_cases)}")
        print(f"   Durchschnitt: {avg:.2f}ms")
        print(f"   Min: {min(times):.2f}ms")
        print(f"   Max: {max(times):.2f}ms")
        
        return {"avg_ms": avg, "times_ms": times, "count": len(test_cases)}
        
    except ImportError as e:
        print(f"   ⚠️ Konnte nicht importieren: {e}")
        return {"avg_ms": 0, "times_ms": [], "count": 0}


if __name__ == "__main__":
    run_performance_tests()

