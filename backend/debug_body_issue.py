#!/usr/bin/env python3
# ============================================================================
# FILE: debug_body_issue.py
# DESCRIPTION: Debugging script to test body reading behavior
# ============================================================================

"""
Quick debugging script to test body reading in FastAPI

Usage:
    python debug_body_issue.py

This demonstrates the "Body already read" problem and how to fix it.
"""

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient


app = FastAPI()


@app.post("/test-body-problem")
async def test_body_problem(request: Request):
    """Demonstrates the body reading problem"""
    
    print("\n" + "="*70)
    print("🧪 TESTING: Body Reading Problem")
    print("="*70)
    
    print("\n1. First read attempt...")
    try:
        body1 = await request.body()
        print(f"   ✅ Success: {len(body1)} bytes read")
        print(f"   Content: {body1[:100]}...")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return {"error": str(e), "step": "first_read"}
    
    print("\n2. Second read attempt...")
    try:
        body2 = await request.body()
        print(f"   ✅ Success: {len(body2)} bytes read")
        print(f"   Content: {body2[:100]}...")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        print("\n⚠️  This is expected! FastAPI/Starlette only allows ONE body read!")
        return {
            "error": "Body already consumed",
            "first_read_worked": True,
            "second_read_failed": True,
            "conclusion": "request.body() can only be called ONCE in FastAPI"
        }
    
    return {"status": "ok", "reads": 2}


@app.post("/test-pydantic-solution")
async def test_pydantic_solution(data: dict):
    """Demonstrates the correct solution using Pydantic"""
    
    print("\n" + "="*70)
    print("✅ TESTING: Pydantic Solution (CORRECT)")
    print("="*70)
    print(f"\nReceived data: {data}")
    print("✅ FastAPI handled body reading automatically!")
    print("✅ No manual request.body() needed!")
    
    return {
        "status": "success",
        "method": "pydantic",
        "data": data,
    }


if __name__ == "__main__":
    client = TestClient(app)
    
    print("\n" + "🔬 " + "="*68)
    print("FastAPI Body Reading Test Suite")
    print("="*70 + "\n")
    
    test_data = {"test": "data", "workspace_id": "123"}
    
    # Test 1: Problem demonstration
    print("TEST 1: Demonstrating the problem...")
    print("-" * 70)
    response1 = client.post("/test-body-problem", json=test_data)
    print(f"\nResponse: {response1.json()}")
    
    # Test 2: Solution demonstration
    print("\n\nTEST 2: Demonstrating the solution...")
    print("-" * 70)
    response2 = client.post("/test-pydantic-solution", json=test_data)
    print(f"\nResponse: {response2.json()}")
    
    print("\n" + "="*70)
    print("📝 CONCLUSION")
    print("="*70)
    print("""
In FastAPI, request.body() can only be called ONCE!

❌ WRONG:
    async def endpoint(request: Request):
        body1 = await request.body()  # ✅ Works
        body2 = await request.body()  # ❌ Fails!

✅ CORRECT:
    async def endpoint(data: YourModel):
        # FastAPI reads body automatically
        # Use 'data' directly
        return {"result": data}

🔧 FIX OPTIONS:
1. Use Pydantic models (RECOMMENDED)
2. Use BodyCacheMiddleware (for complex cases)
3. Don't read body in rate limiters/middleware
    """)

