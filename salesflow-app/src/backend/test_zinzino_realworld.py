"""
================================================================================
ZINZINO REAL-WORLD TESTING SCRIPT
================================================================================

Dieses Script testet Live Assist mit echten Zinzino-User-Szenarien.
Kann sowohl als CLI-Tool als auch programmatisch verwendet werden.

Verwendung:
    python test_zinzino_realworld.py --user-id UUID --company-id UUID
    python test_zinzino_realworld.py --interactive

================================================================================
"""

import os
import sys
import asyncio
import argparse
import random
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from dotenv import load_dotenv

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

# Import services
try:
    from app.services.live_assist.service_v3 import LiveAssistServiceV3
    from app.services.live_assist.intent_detection import detect_intent
    from app.services.live_assist.emotion import analyze_emotion
    from supabase import create_client
    HAS_SERVICES = True
except ImportError as e:
    print(f"[WARN] Services nicht verfuegbar: {e}")
    HAS_SERVICES = False


# =============================================================================
# TEST SCENARIOS
# =============================================================================

ZINZINO_SCENARIOS = [
    {
        "name": "Skeptischer Neukunde",
        "description": "Interessent ist skeptisch gegenueber Network Marketing",
        "queries": [
            "Was ist Zinzino eigentlich?",
            "Kunde sagt: Das klingt nach MLM Abzocke",
            "Gibt es Studien die das belegen?",
            "Kunde sagt: Ich bin skeptisch",
            "Warum sollte ich das nehmen statt Omega 3 aus der Apotheke?",
        ],
        "expected_moods": ["skeptisch", "neutral", "neutral"],
        "difficulty": "hard"
    },
    {
        "name": "Preis-Sensitiver Interessent",
        "description": "Interessent findet das Produkt zu teuer",
        "queries": [
            "Was kostet das BalanceOil?",
            "Kunde sagt: 50 Euro im Monat ist mir zu teuer",
            "Gib mir Argumente warum sich der Preis lohnt",
            "Was kostet das pro Tag umgerechnet?",
            "Kunde sagt: Bei Amazon gibts Omega 3 fuer 15 Euro",
        ],
        "expected_moods": ["neutral", "skeptisch", "neutral"],
        "difficulty": "medium"
    },
    {
        "name": "Warmer Lead - Interessiert",
        "description": "Lead ist bereits interessiert, hat Fragen",
        "queries": [
            "Wie funktioniert der Bluttest?",
            "Wann sehe ich Ergebnisse?",
            "Was genau misst der Test?",
            "Wie kann ich bestellen?",
        ],
        "expected_moods": ["positiv", "positiv", "neutral"],
        "difficulty": "easy"
    },
    {
        "name": "Zeitmangel",
        "description": "Lead hat angeblich keine Zeit",
        "queries": [
            "Kunde sagt: Ich hab gerade keine Zeit",
            "Wie lange dauert der Test?",
            "Kann ich das irgendwann spaeter machen?",
        ],
        "expected_moods": ["gestresst", "neutral", "neutral"],
        "difficulty": "medium"
    },
    {
        "name": "Gesundheitsbewusster Kunde",
        "description": "Bereits gesundheitsorientiert, will optimieren",
        "queries": [
            "Ich nehme schon Omega 3 von Norsan",
            "Was unterscheidet Zinzino von anderen Anbietern?",
            "Welche Inhaltsstoffe sind genau drin?",
            "Wie verbessert sich mein Omega 3 Index?",
        ],
        "expected_moods": ["neutral", "positiv", "neutral"],
        "difficulty": "easy"
    },
    {
        "name": "Partner-Einbindung",
        "description": "Lead muss erst mit Partner sprechen",
        "queries": [
            "Kunde sagt: Muss erst mit meiner Frau sprechen",
            "Gibt es Infomaterial das ich zeigen kann?",
            "Gibt es einen Familienrabatt?",
        ],
        "expected_moods": ["neutral", "neutral", "neutral"],
        "difficulty": "medium"
    },
    {
        "name": "Think About It",
        "description": "Lead will darueber nachdenken",
        "queries": [
            "Kunde sagt: Ich muss drueber nachdenken",
            "Wie lange ist das Angebot gueltig?",
            "Kann ich spaeter noch bestellen?",
        ],
        "expected_moods": ["neutral", "neutral", "neutral"],
        "difficulty": "medium"
    },
]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def print_header(text: str):
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def print_section(text: str):
    print(f"\n--- {text} ---")

def format_response(response: Dict[str, Any]) -> str:
    """Formatiert eine Live Assist Response fuer die Ausgabe."""
    lines = []
    lines.append(f"Intent: {response.get('detected_intent', 'N/A')} ({response.get('confidence', 0)*100:.0f}%)")
    
    if response.get('objection_type'):
        lines.append(f"Einwand: {response['objection_type']}")
    
    if response.get('contact_mood'):
        lines.append(f"Stimmung: {response['contact_mood']} | Entscheidung: {response.get('decision_tendency', 'N/A')}")
    
    lines.append(f"Antwort ({response.get('response_time_ms', '?')}ms):")
    lines.append(f"  \"{response.get('response_text', 'Keine Antwort')[:150]}...\"")
    
    if response.get('follow_up_question'):
        lines.append(f"Follow-up: \"{response['follow_up_question']}\"")
    
    return "\n".join(lines)


# =============================================================================
# TEST RUNNER
# =============================================================================

@dataclass
class TestResult:
    scenario_name: str
    query: str
    success: bool
    response_time_ms: int
    detected_intent: str
    expected_intent: Optional[str]
    contact_mood: str
    error: Optional[str] = None


async def run_scenario_test(
    service: 'LiveAssistServiceV3',
    user_id: str,
    company_id: str,
    scenario: Dict[str, Any],
    verbose: bool = True
) -> List[TestResult]:
    """Fuehrt ein einzelnes Szenario durch."""
    
    results = []
    session_id = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}"
    
    if verbose:
        print_section(f"Szenario: {scenario['name']}")
        print(f"Beschreibung: {scenario['description']}")
        print(f"Schwierigkeit: {scenario['difficulty']}")
    
    for i, query in enumerate(scenario['queries'], 1):
        if verbose:
            print(f"\n[{i}] Query: \"{query}\"")
        
        try:
            # Rufe Live Assist auf
            response = await service.process_query(
                user_id=user_id,
                company_id=company_id,
                session_id=session_id,
                query_text=query,
                vertical="network_marketing",
                language="de"
            )
            
            result = TestResult(
                scenario_name=scenario['name'],
                query=query,
                success=True,
                response_time_ms=response.get('response_time_ms', 0),
                detected_intent=response.get('detected_intent', 'N/A'),
                expected_intent=None,  # Could be enhanced
                contact_mood=response.get('contact_mood', 'N/A'),
            )
            results.append(result)
            
            if verbose:
                print(format_response(response))
                
        except Exception as e:
            result = TestResult(
                scenario_name=scenario['name'],
                query=query,
                success=False,
                response_time_ms=0,
                detected_intent='ERROR',
                expected_intent=None,
                contact_mood='N/A',
                error=str(e)
            )
            results.append(result)
            
            if verbose:
                print(f"[ERROR] {e}")
    
    return results


async def run_all_scenarios(
    user_id: str,
    company_id: str,
    scenarios: List[Dict[str, Any]] = None,
    verbose: bool = True
) -> Dict[str, Any]:
    """Fuehrt alle Szenarien durch und gibt Zusammenfassung."""
    
    if not HAS_SERVICES:
        print("[ERROR] Services nicht verfuegbar. Verwende Mock-Modus.")
        return run_mock_scenarios(scenarios or ZINZINO_SCENARIOS)
    
    # Initialize Supabase
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    
    scenarios_to_run = scenarios or ZINZINO_SCENARIOS
    
    if not supabase_url or not supabase_key:
        print("[INFO] Supabase Credentials nicht gefunden - verwende Mock-Modus")
        return run_mock_scenarios(scenarios_to_run)
    
    db = create_client(supabase_url, supabase_key)
    service = LiveAssistServiceV3(db)
    
    all_results = []
    
    print_header("ZINZINO REAL-WORLD TEST")
    print(f"User ID: {user_id}")
    print(f"Company ID: {company_id}")
    print(f"Szenarien: {len(scenarios_to_run)}")
    
    for scenario in scenarios_to_run:
        results = await run_scenario_test(
            service=service,
            user_id=user_id,
            company_id=company_id,
            scenario=scenario,
            verbose=verbose
        )
        all_results.extend(results)
    
    # Summary
    print_header("ZUSAMMENFASSUNG")
    
    total = len(all_results)
    successful = len([r for r in all_results if r.success])
    avg_response_time = sum(r.response_time_ms for r in all_results if r.success) / max(successful, 1)
    under_200ms = len([r for r in all_results if r.success and r.response_time_ms < 200])
    
    print(f"\nErfolgsrate: {successful}/{total} ({successful/total*100:.0f}%)")
    print(f"Avg Response Time: {avg_response_time:.0f}ms")
    print(f"Unter 200ms: {under_200ms}/{successful} ({under_200ms/max(successful,1)*100:.0f}%)")
    
    # Intent Distribution
    print("\nIntent-Verteilung:")
    intent_counts = {}
    for r in all_results:
        intent_counts[r.detected_intent] = intent_counts.get(r.detected_intent, 0) + 1
    for intent, count in sorted(intent_counts.items(), key=lambda x: -x[1]):
        print(f"  {intent}: {count}")
    
    # Mood Distribution
    print("\nStimmungs-Verteilung:")
    mood_counts = {}
    for r in all_results:
        mood_counts[r.contact_mood] = mood_counts.get(r.contact_mood, 0) + 1
    for mood, count in sorted(mood_counts.items(), key=lambda x: -x[1]):
        print(f"  {mood}: {count}")
    
    return {
        "total": total,
        "successful": successful,
        "avg_response_time_ms": avg_response_time,
        "under_200ms_percentage": under_200ms / max(successful, 1) * 100,
        "results": all_results
    }


def run_mock_scenarios(scenarios: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Mock-Ausfuehrung wenn keine Services verfuegbar."""
    print_header("MOCK MODUS - Nur Intent Detection")
    
    results = []
    for scenario in scenarios:
        print_section(f"Szenario: {scenario['name']}")
        
        for query in scenario['queries']:
            intent_result = detect_intent(query, language="de")
            emotion_result = analyze_emotion(query)
            
            print(f"\n  Query: \"{query}\"")
            print(f"    Intent: {intent_result.intent} ({intent_result.confidence*100:.0f}%)")
            print(f"    Objection: {intent_result.objection_type or 'N/A'}")
            print(f"    Mood: {emotion_result.contact_mood}")
            print(f"    Decision: {emotion_result.decision_tendency}")
            
            results.append({
                "query": query,
                "intent": intent_result.intent,
                "objection_type": intent_result.objection_type,
                "contact_mood": emotion_result.contact_mood,
            })
    
    return {"mode": "mock", "results": results}


# =============================================================================
# INTERACTIVE MODE
# =============================================================================

async def interactive_mode(user_id: str, company_id: str):
    """Interaktiver Modus fuer manuelle Tests."""
    
    print_header("ZINZINO LIVE ASSIST - INTERAKTIVER MODUS")
    print("Tippe deine Anfrage ein oder 'exit' zum Beenden.")
    print("Beispiele: 'Kunde sagt zu teuer', 'Warum Zinzino?', 'Gib mir Zahlen'\n")
    
    session_id = f"interactive_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    if HAS_SERVICES:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
        db = create_client(supabase_url, supabase_key)
        service = LiveAssistServiceV3(db)
    else:
        service = None
    
    while True:
        try:
            query = input("\n> ").strip()
            
            if query.lower() in ['exit', 'quit', 'q']:
                print("Auf Wiedersehen!")
                break
            
            if not query:
                continue
            
            # Intent Detection (immer verfuegbar)
            intent_result = detect_intent(query, language="de")
            emotion_result = analyze_emotion(query)
            
            print(f"\n  Intent: {intent_result.intent} ({intent_result.confidence*100:.0f}%)")
            print(f"  Objection: {intent_result.objection_type or '-'}")
            print(f"  Mood: {emotion_result.contact_mood} | Decision: {emotion_result.decision_tendency}")
            
            # Full response if service available
            if service:
                response = await service.process_query(
                    user_id=user_id,
                    company_id=company_id,
                    session_id=session_id,
                    query_text=query,
                    vertical="network_marketing",
                    language="de"
                )
                print(f"\n  Antwort ({response.get('response_time_ms', '?')}ms):")
                print(f"  \"{response.get('response_text', 'Keine Antwort')}\"")
                
                if response.get('follow_up_question'):
                    print(f"\n  Follow-up: \"{response['follow_up_question']}\"")
            
        except KeyboardInterrupt:
            print("\n\nAbgebrochen.")
            break
        except Exception as e:
            print(f"[ERROR] {e}")


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Zinzino Real-World Testing Script"
    )
    parser.add_argument(
        "--user-id", 
        type=str, 
        default="test_user_zinzino",
        help="User ID fuer die Tests"
    )
    parser.add_argument(
        "--company-id", 
        type=str, 
        default="test_company_zinzino",
        help="Company ID fuer die Tests"
    )
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Interaktiver Modus"
    )
    parser.add_argument(
        "--scenario",
        type=str,
        help="Nur ein bestimmtes Szenario ausfuehren"
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Weniger Output"
    )
    
    args = parser.parse_args()
    
    if args.interactive:
        asyncio.run(interactive_mode(args.user_id, args.company_id))
    else:
        scenarios = ZINZINO_SCENARIOS
        if args.scenario:
            scenarios = [s for s in ZINZINO_SCENARIOS if args.scenario.lower() in s['name'].lower()]
            if not scenarios:
                print(f"Kein Szenario gefunden mit '{args.scenario}'")
                print("Verfuegbare Szenarien:")
                for s in ZINZINO_SCENARIOS:
                    print(f"  - {s['name']}")
                sys.exit(1)
        
        asyncio.run(run_all_scenarios(
            user_id=args.user_id,
            company_id=args.company_id,
            scenarios=scenarios,
            verbose=not args.quiet
        ))


if __name__ == "__main__":
    main()

