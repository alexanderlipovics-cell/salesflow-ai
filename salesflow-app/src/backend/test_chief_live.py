"""
Live-Test: CHIEF mit Zinzino-Kontext
"""

import os
import asyncio
import httpx
from dotenv import load_dotenv
load_dotenv()

API_BASE = "http://localhost:8000/api/v1"


async def test_chief_zinzino():
    """Testet CHIEF mit Zinzino-Anfragen"""
    
    print("=" * 70)
    print("🧪 LIVE-TEST: CHIEF mit Zinzino-Wissen")
    print("=" * 70)
    
    # Test-Anfragen
    test_cases = [
        {
            "name": "Elevator Pitch",
            "message": "Erkläre mir Zinzino in 30 Sekunden",
            "context": {"company_slug": "zinzino"}
        },
        {
            "name": "Skeptiker-Einwand",
            "message": "Ein Kunde sagt: 'Omega-3 gibt es doch überall, warum Zinzino?'",
            "context": {"company_slug": "zinzino"}
        },
        {
            "name": "BalanceTest erklären",
            "message": "Wie erkläre ich den BalanceTest einfach?",
            "context": {"company_slug": "zinzino"}
        },
    ]
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for test in test_cases:
            print(f"\n{'─' * 70}")
            print(f"📝 TEST: {test['name']}")
            print(f"   Anfrage: {test['message']}")
            print(f"{'─' * 70}")
            
            try:
                # Versuche verschiedene Endpunkte
                endpoints = [
                    "/ai/chief/generate",
                    "/ai/chief/chat",
                    "/ai/generate",
                    "/chief/generate",
                ]
                
                response = None
                for endpoint in endpoints:
                    try:
                        r = await client.post(
                            f"{API_BASE}{endpoint}",
                            json={
                                "message": test["message"],
                                "prompt": test["message"],
                                "context": test.get("context", {}),
                                "company_slug": "zinzino",
                            }
                        )
                        if r.status_code == 200:
                            response = r
                            print(f"   ✅ Endpoint: {endpoint}")
                            break
                        elif r.status_code != 404:
                            print(f"   ⚠️ {endpoint}: {r.status_code}")
                    except Exception as e:
                        continue
                
                if response and response.status_code == 200:
                    data = response.json()
                    
                    # Extrahiere Antwort
                    answer = (
                        data.get("response") or 
                        data.get("message") or 
                        data.get("content") or 
                        data.get("text") or
                        str(data)
                    )
                    
                    print(f"\n🤖 CHIEF antwortet:")
                    print("-" * 50)
                    # Zeige erste 600 Zeichen
                    if len(answer) > 600:
                        print(answer[:600] + "...")
                    else:
                        print(answer)
                    
                    # Check auf Compliance
                    forbidden = ["heilt", "garantiert", "kuriert", "100%"]
                    found_issues = [w for w in forbidden if w.lower() in answer.lower()]
                    if found_issues:
                        print(f"\n⚠️ COMPLIANCE-WARNING: Gefunden: {found_issues}")
                    else:
                        print(f"\n✅ Compliance OK")
                        
                else:
                    print(f"   ❌ Kein erfolgreicher Endpoint gefunden")
                    
            except Exception as e:
                print(f"   ❌ Fehler: {e}")
    
    print("\n" + "=" * 70)
    print("✅ LIVE-TEST COMPLETE")
    print("=" * 70)


async def check_api_health():
    """Prüft ob die API läuft"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{API_BASE}/health")
            if r.status_code == 200:
                print("✅ API ist online")
                return True
    except:
        pass
    
    print("❌ API nicht erreichbar - bitte Backend starten!")
    return False


async def list_available_endpoints():
    """Listet verfügbare AI-Endpunkte"""
    print("\n🔍 Suche nach AI-Endpunkten...")
    
    endpoints_to_check = [
        "/ai/chief/generate",
        "/ai/chief/chat", 
        "/ai/generate",
        "/ai/chat",
        "/chief/generate",
        "/chief/chat",
        "/generate",
        "/chat",
    ]
    
    found = []
    async with httpx.AsyncClient(timeout=5.0) as client:
        for ep in endpoints_to_check:
            try:
                # OPTIONS oder POST ohne Body
                r = await client.options(f"{API_BASE}{ep}")
                if r.status_code != 404:
                    found.append(ep)
            except:
                pass
    
    if found:
        print(f"   Gefunden: {found}")
    return found


if __name__ == "__main__":
    async def main():
        if await check_api_health():
            await list_available_endpoints()
            await test_chief_zinzino()
        else:
            print("\nBitte starte das Backend mit:")
            print("  cd backend && python -m uvicorn app.main:app --reload")
    
    asyncio.run(main())

