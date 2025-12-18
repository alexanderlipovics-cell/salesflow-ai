"""Test script to check for import errors"""

import sys
import traceback

print("Testing imports...")

try:
    print("1. Testing app.db.deps...")
    from app.db.deps import get_db, get_async_db, get_supabase_client
    print("   ✓ app.db.deps imported successfully")
except Exception as e:
    print(f"   ✗ Error importing app.db.deps: {e}")
    traceback.print_exc()
    sys.exit(1)

try:
    print("2. Testing app.main...")
    from app.main import app
    print("   ✓ app.main imported successfully")
except Exception as e:
    print(f"   ✗ Error importing app.main: {e}")
    traceback.print_exc()
    sys.exit(1)

try:
    print("3. Testing app.routers.conversation_webhooks...")
    from app.routers.conversation_webhooks import router
    print("   ✓ conversation_webhooks router imported successfully")
except Exception as e:
    print(f"   ✗ Error importing conversation_webhooks: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\n✅ All imports successful!")

