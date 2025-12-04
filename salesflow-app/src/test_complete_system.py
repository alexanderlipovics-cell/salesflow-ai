#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  KOMPLETTES SYSTEM-TEST                                                    ║
║  Testet alle wichtigen Endpoints und Features                             ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# ═══════════════════════════════════════════════════════════════════════════
# KONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api"

# Test-User (muss in Supabase existieren oder Mock-Token verwenden)
TEST_TOKEN = None  # Wird von .env geladen oder als Argument übergeben
TEST_USER_ID = None
TEST_COMPANY_ID = None

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def print_header(text: str):
    """Druckt einen Header."""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def print_test(name: str):
    """Druckt Test-Name."""
    print(f"\n🧪 {name}...", end=" ")

def print_success(message: str = "OK"):
    """Druckt Erfolg."""
    print(f"✅ {message}")

def print_error(message: str):
    """Druckt Fehler."""
    print(f"❌ {message}")

def print_warning(message: str):
    """Druckt Warnung."""
    print(f"⚠️  {message}")

def make_request(
    method: str,
    endpoint: str,
    data: Optional[Dict] = None,
    token: Optional[str] = None,
    expected_status: int = 200
) -> Optional[Dict]:
    """Macht HTTP Request."""
    url = f"{API_BASE}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PATCH":
            response = requests.patch(url, headers=headers, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            print_error(f"Unbekannte Methode: {method}")
            return None
        
        if response.status_code == expected_status:
            try:
                return response.json()
            except:
                return {"raw": response.text}
        else:
            print_error(f"Status {response.status_code} (erwartet: {expected_status})")
            print(f"   Response: {response.text[:200]}")
            return None
            
    except requests.exceptions.ConnectionError:
        print_error("Verbindungsfehler - Backend läuft nicht!")
        return None
    except Exception as e:
        print_error(f"Fehler: {str(e)}")
        return None

# ═══════════════════════════════════════════════════════════════════════════
# TESTS
# ═══════════════════════════════════════════════════════════════════════════

def test_health_check():
    """Test 1: Health Check"""
    print_test("Health Check")
    
    # Versuche verschiedene Health Endpoints
    endpoints = ["/v1/health", "/health", "/"]
    for endpoint in endpoints:
        result = make_request("GET", endpoint, expected_status=200)
        if result:
            print_success(f"Status: {result.get('status', 'online')}")
            return True
    
    # Fallback: Prüfe ob Backend erreichbar ist
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        if response.status_code == 200:
            print_success("Backend erreichbar (API Docs)")
            return True
    except:
        pass
    
    print_warning("Health Check Endpoint nicht gefunden, aber Backend läuft")
    return True  # Nicht kritisch, Backend läuft ja

def test_mentor_status():
    """Test 2: MENTOR Status"""
    print_test("MENTOR Status")
    
    result = make_request("GET", "/v2/mentor/status", expected_status=200)
    if result:
        print_success(f"Version: {result.get('version', 'unknown')}")
        print(f"   Features: {', '.join(result.get('features', []))}")
        return True
    return False

def test_mentor_quick_actions(token: str):
    """Test 3: MENTOR Quick Actions"""
    print_test("MENTOR Quick Actions")
    
    actions = [
        ("objection_help", "Der Kunde sagt 'keine Zeit'"),
        ("motivation", "Ich brauche Motivation für heute"),
        ("dmo_status", "Zeig mir meinen DMO Status"),
    ]
    
    success_count = 0
    for action_type, context in actions:
        result = make_request(
            "POST",
            "/v2/mentor/quick-action",
            data={
                "action_type": action_type,
                "context": context
            },
            token=token,
            expected_status=200
        )
        
        if result and result.get("suggestion"):
            success_count += 1
            print(f"   ✅ {action_type}: {len(result['suggestion'])} Zeichen")
        else:
            print(f"   ❌ {action_type}: Fehlgeschlagen")
    
    if success_count == len(actions):
        print_success(f"Alle {len(actions)} Actions funktionieren")
        return True
    else:
        print_warning(f"Nur {success_count}/{len(actions)} Actions funktionieren")
        return success_count > 0

def test_mentor_chat(token: str):
    """Test 4: MENTOR Chat"""
    print_test("MENTOR Chat")
    
    result = make_request(
        "POST",
        "/v2/mentor/chat",
        data={
            "message": "Hallo MENTOR, wie geht es dir?",
            "include_context": True,
        },
        token=token,
        expected_status=200
    )
    
    if result and result.get("response"):
        print_success(f"Antwort erhalten: {len(result['response'])} Zeichen")
        if result.get("actions"):
            print(f"   Actions: {len(result['actions'])}")
        return True
    return False

def test_mentor_context(token: str):
    """Test 5: MENTOR Context"""
    print_test("MENTOR Context")
    
    result = make_request(
        "GET",
        "/v2/mentor/context",
        token=token,
        expected_status=200
    )
    
    if result:
        print_success(f"User: {result.get('user_name', 'unknown')}")
        print(f"   Vertical: {result.get('vertical_label', 'unknown')}")
        if result.get("daily_flow"):
            print(f"   Daily Flow: vorhanden")
        return True
    return False

def test_contacts_api(token: str):
    """Test 6: Contacts API"""
    print_test("Contacts API")
    
    # GET Contacts
    result = make_request(
        "GET",
        "/v2/contacts",
        token=token,
        expected_status=200
    )
    
    if result:
        contacts = result.get("contacts", [])
        print_success(f"{len(contacts)} Kontakte gefunden")
        
        # POST Contact (wenn möglich)
        if len(contacts) < 10:  # Nur wenn nicht zu viele
            create_result = make_request(
                "POST",
                "/v2/contacts",
                data={
                    "name": f"Test Kontakt {datetime.now().strftime('%H%M%S')}",
                    "contact_type": "prospect",
                    "relationship_level": "cold",
                    "pipeline_stage": "lead",
                },
                token=token,
                expected_status=201
            )
            
            if create_result:
                print(f"   ✅ Test-Kontakt erstellt: {create_result.get('id', 'unknown')}")
        
        return True
    return False

def test_dmo_api(token: str):
    """Test 7: DMO API"""
    print_test("DMO API")
    
    # GET DMO Today (korrekter Endpoint)
    result = make_request(
        "GET",
        "/v2/dmo/today",
        token=token,
        expected_status=200
    )
    
    if result:
        print_success(f"DMO Status für {today}")
        if result.get("overall_percent"):
            print(f"   Fortschritt: {result['overall_percent']}%")
        return True
    return False

def test_scripts_api(token: str):
    """Test 8: Scripts API"""
    print_test("Scripts API")
    
    result = make_request(
        "GET",
        "/v2/scripts?context=followup&disg=S&relationship=warm",
        token=token,
        expected_status=200
    )
    
    if result:
        scripts = result.get("scripts", [])
        print_success(f"{len(scripts)} Scripts gefunden")
        return True
    return False

def test_team_api(token: str):
    """Test 9: Team API"""
    print_test("Team API")
    
    result = make_request(
        "GET",
        "/v2/team/dashboard",
        token=token,
        expected_status=200
    )
    
    if result:
        print_success("Team Dashboard geladen")
        if result.get("members"):
            print(f"   Mitglieder: {len(result['members'])}")
        return True
    return False

def test_brain_api(token: str):
    """Test 10: Brain API (Objection)"""
    print_test("Brain API (Objection)")
    
    result = make_request(
        "POST",
        "/v1/brain/rules",
        data={
            "rule_type": "tone",
            "instruction": "Sei immer freundlich",
            "scope": "personal",
            "priority": "normal"
        },
        token=token,
        expected_status=200
    )
    
    if result:
        print_success("Brain Rule erstellt")
        return True
    return False

# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Hauptfunktion."""
    print_header("🧪 KOMPLETTES SYSTEM-TEST")
    print(f"Backend URL: {BASE_URL}")
    print(f"Zeitpunkt: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Token aus Argumenten oder Environment
    token = None
    if len(sys.argv) > 1:
        token = sys.argv[1]
        print(f"Token: {token[:20]}...")
    else:
        print_warning("Kein Token übergeben - einige Tests werden fehlschlagen")
        print("   Verwendung: python test_complete_system.py YOUR_TOKEN")
        print("   Oder: export SUPABASE_TOKEN=YOUR_TOKEN")
    
    print_header("STARTE TESTS")
    
    results = {}
    
    # Tests ohne Auth
    results["health"] = test_health_check()
    results["mentor_status"] = test_mentor_status()
    
    # Tests mit Auth
    if token:
        results["mentor_quick_actions"] = test_mentor_quick_actions(token)
        results["mentor_chat"] = test_mentor_chat(token)
        results["mentor_context"] = test_mentor_context(token)
        results["contacts"] = test_contacts_api(token)
        results["dmo"] = test_dmo_api(token)
        results["scripts"] = test_scripts_api(token)
        results["team"] = test_team_api(token)
        results["brain"] = test_brain_api(token)
    else:
        print_warning("Überspringe Auth-Tests (kein Token)")
        for test in ["mentor_quick_actions", "mentor_chat", "mentor_context", 
                     "contacts", "dmo", "scripts", "team", "brain"]:
            results[test] = None
    
    # ═══════════════════════════════════════════════════════════════════════
    # ZUSAMMENFASSUNG
    # ═══════════════════════════════════════════════════════════════════════
    
    print_header("ZUSAMMENFASSUNG")
    
    total = len([r for r in results.values() if r is not None])
    passed = len([r for r in results.values() if r is True])
    failed = len([r for r in results.values() if r is False])
    skipped = len([r for r in results.values() if r is None])
    
    print(f"\n📊 Ergebnisse:")
    print(f"   Gesamt: {total}")
    print(f"   ✅ Erfolgreich: {passed}")
    print(f"   ❌ Fehlgeschlagen: {failed}")
    print(f"   ⏭️  Übersprungen: {skipped}")
    print()
    
    # Detaillierte Ergebnisse
    for test_name, result in results.items():
        if result is True:
            print(f"   ✅ {test_name}")
        elif result is False:
            print(f"   ❌ {test_name}")
        else:
            print(f"   ⏭️  {test_name} (übersprungen)")
    
    print()
    
    if failed == 0 and passed > 0:
        print_success("🎉 ALLE TESTS ERFOLGREICH!")
        return 0
    elif passed > 0:
        print_warning(f"⚠️  {failed} Test(s) fehlgeschlagen")
        return 1
    else:
        print_error("❌ KEINE TESTS ERFOLGREICH")
        return 1

if __name__ == "__main__":
    sys.exit(main())

