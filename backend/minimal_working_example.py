#!/usr/bin/env python3
# ============================================================================
# FILE: minimal_working_example.py
# DESCRIPTION: Minimal working example WITHOUT body read issues
# ============================================================================

"""
Minimal working example demonstrating correct FastAPI patterns
Run: python minimal_working_example.py
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.testclient import TestClient


app = FastAPI(title="Sales Flow AI - Minimal Example")


# ============================================================================
# MODELS
# ============================================================================

class CoachingInput(BaseModel):
    """Input model for coaching endpoint"""
    workspace_id: str = Field(..., description="Workspace ID")
    user_id: str = Field(..., description="User ID")
    data: dict = Field(default_factory=dict, description="Additional data")


class CoachingOutput(BaseModel):
    """Output model for coaching endpoint"""
    result: str
    workspace_id: str
    processed: bool = True


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.post("/coaching/squad", response_model=CoachingOutput)
async def generate_coaching(coaching_input: CoachingInput) -> CoachingOutput:
    """
    Generate AI coaching for squad
    
    ✅ CORRECT: Use Pydantic model - FastAPI handles body reading
    ❌ WRONG: Don't use request.body() manually
    
    This works because:
    1. FastAPI reads body ONCE
    2. Validates against Pydantic model
    3. Passes validated object to function
    4. We never manually call request.body()
    """
    
    # FastAPI already parsed the body into coaching_input
    # No need to read request.body()
    
    print(f"✅ Processing coaching for workspace: {coaching_input.workspace_id}")
    print(f"   User: {coaching_input.user_id}")
    print(f"   Additional data: {coaching_input.data}")
    
    # Your business logic here
    result = f"Coaching generated for {coaching_input.workspace_id}"
    
    return CoachingOutput(
        result=result,
        workspace_id=coaching_input.workspace_id,
    )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Sales Flow AI",
        "body_read_issues": "NONE ✅"
    }


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*70)
    print("🧪 Testing Minimal Working Example")
    print("="*70 + "\n")
    
    client = TestClient(app)
    
    # Test data
    test_payload = {
        "workspace_id": "workspace-123",
        "user_id": "user-456",
        "data": {
            "focus": "follow_up_discipline",
            "team_size": 10
        }
    }
    
    print("📤 Sending request to /coaching/squad...")
    print(f"   Payload: {test_payload}\n")
    
    response = client.post("/coaching/squad", json=test_payload)
    
    print("📥 Response:")
    print(f"   Status: {response.status_code}")
    print(f"   Body: {response.json()}\n")
    
    if response.status_code == 200:
        print("✅ SUCCESS! No body reading issues!")
    else:
        print(f"❌ FAILED! Status: {response.status_code}")
    
    print("\n" + "="*70)
    print("📝 KEY TAKEAWAYS")
    print("="*70)
    print("""
✅ DO:
  - Use Pydantic models for request bodies
  - Let FastAPI handle body parsing
  - Access data via function parameters

❌ DON'T:
  - Manually call request.body()
  - Read body in middleware (unless caching)
  - Read body in rate limiters
  - Read body in logging (unless using middleware)

🔧 IF YOU MUST READ BODY MULTIPLE TIMES:
  - Use BodyCacheMiddleware (see app/middleware/body_cache.py)
  - Or use WorkspaceExtractorMiddleware for specific fields
    """)

