#!/usr/bin/env python3
"""Testet alle Sales Intelligence API Endpoints."""

import requests
import json

BASE = "http://localhost:8000/api/v1/sales-intelligence"

def test_endpoint(method, path, expected_status=200, data=None):
    """Testet einen Endpoint."""
    url = f"{BASE}{path}"
    try:
        if method == "GET":
            r = requests.get(url, timeout=5)
        elif method == "POST":
            r = requests.post(url, json=data, timeout=5)
        
        if r.status_code == expected_status:
            return True, r.status_code, None
        else:
            return False, r.status_code, r.text[:100]
    except Exception as e:
        return False, 0, str(e)[:50]

def main():
    print("=" * 60)
    print("  SALES INTELLIGENCE API - VOLLSTÄNDIGER TEST")
    print("=" * 60)
    print()
    
    tests = [
        # Basis Endpoints (ohne Auth)
        ("GET", "/languages", 200),
        ("GET", "/languages/de", 200),
        ("GET", "/languages/en-us", 200),
        ("GET", "/frameworks", 200),
        ("GET", "/frameworks/spin", 200),
        ("GET", "/frameworks/challenger", 200),
        ("GET", "/buyer-types", 200),
        ("GET", "/buyer-types/driver", 200),
        ("GET", "/buying-stages", 200),
        ("GET", "/industries", 200),
        ("GET", "/industries/network_marketing", 200),
        
        # POST Endpoints (ohne Auth, sollten 200/422 zurückgeben)
        ("POST", "/languages/detect", 200),
        ("POST", "/frameworks/recommend", 200),
        ("POST", "/momentum/calculate", 200),
        ("POST", "/coaching/micro", 200),
        ("POST", "/phone-mode/start", 200),
        ("POST", "/competitive/handle", 200),
    ]
    
    # Test-Daten für POST Requests
    post_data = {
        "/languages/detect": {"text": "Servus, wie geht's dir?"},
        "/frameworks/recommend": {"deal_size": "medium", "sales_cycle": "medium", "lead_type": "warm"},
        "/momentum/calculate": {"lead_id": "test-123", "signals": []},
        "/coaching/micro": {"action_type": "send_followup", "context": {}},
        "/phone-mode/start": {"lead_id": "test-123", "lead_name": "Test Lead", "call_type": "warm"},
        "/competitive/handle": {"competitor_name": "Other Tool", "mention_type": "price"},
    }
    
    passed = 0
    failed = 0
    
    for method, path, expected in tests:
        data = post_data.get(path) if method == "POST" else None
        success, status, error = test_endpoint(method, path, expected, data)
        
        if success:
            print(f"  ✅ {method:4} {path}")
            passed += 1
        else:
            print(f"  ❌ {method:4} {path} - Status: {status}")
            if error:
                print(f"       {error}")
            failed += 1
    
    print()
    print("=" * 60)
    print(f"  ERGEBNIS: {passed} ✅ OK  |  {failed} ❌ FEHLER")
    print("=" * 60)
    
    # Auth-geschützte Endpoints (erwarten 401/403)
    print()
    print("Auth-geschützte Endpoints (401 erwartet):")
    auth_tests = [
        ("GET", "/ab-tests"),
        ("GET", "/analytics/framework-effectiveness"),
        ("GET", "/analytics/buyer-type-effectiveness"),
        ("GET", "/analytics/industry-effectiveness"),
    ]
    
    for method, path in auth_tests:
        success, status, _ = test_endpoint(method, path, expected_status=401)
        # 401 oder 403 ist OK (bedeutet Auth funktioniert)
        if status in [401, 403, 422]:
            print(f"  ✅ {method:4} {path} (Auth required - {status})")
        else:
            print(f"  ⚠️ {method:4} {path} - Status: {status}")
    
    return failed == 0

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)

