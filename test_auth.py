#!/usr/bin/env python3
"""
Test script for SalesFlow AI Auth System.
Tests signup, login, protected routes, and token refresh.
"""

import asyncio
import aiohttp
import json
from typing import Dict, Any

API_BASE = "http://localhost:8000"

class AuthTester:
    def __init__(self):
        self.session = aiohttp.ClientSession()
        self.access_token = None
        self.refresh_token = None

    async def close(self):
        await self.session.close()

    async def signup(self, email: str, password: str, first_name: str, last_name: str) -> Dict[str, Any]:
        """Test user signup."""
        data = {
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
            "company": "Test Company"
        }

        async with self.session.post(f"{API_BASE}/auth/signup", json=data) as resp:
            result = await resp.json()
            if resp.status == 200:
                self.access_token = result["access_token"]
                self.refresh_token = result["refresh_token"]
                print(f"✅ Signup successful: {email}")
                return result
            else:
                print(f"❌ Signup failed: {result}")
                return result

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """Test user login."""
        data = {"username": email, "password": password}

        async with self.session.post(f"{API_BASE}/auth/login", data=data) as resp:
            result = await resp.json()
            if resp.status == 200:
                self.access_token = result["access_token"]
                self.refresh_token = result["refresh_token"]
                print(f"✅ Login successful: {email}")
                return result
            else:
                print(f"❌ Login failed: {result}")
                return result

    async def get_protected_leads(self) -> Dict[str, Any]:
        """Test access to protected leads endpoint."""
        headers = {"Authorization": f"Bearer {self.access_token}"}

        async with self.session.get(f"{API_BASE}/api/leads", headers=headers) as resp:
            if resp.status == 200:
                result = await resp.json()
                print("✅ Protected leads endpoint accessible")
                return result
            else:
                result = await resp.text()
                print(f"❌ Protected endpoint failed: {result}")
                return {"error": result}

    async def get_protected_leads_unauthorized(self) -> Dict[str, Any]:
        """Test access without auth (should fail)."""
        async with self.session.get(f"{API_BASE}/api/leads") as resp:
            if resp.status == 401:
                print("✅ Unauthorized access properly blocked")
                return {"status": "blocked"}
            else:
                print(f"❌ Should have been blocked: {resp.status}")
                return {"error": f"unexpected status {resp.status}"}

    async def refresh_access_token(self) -> Dict[str, Any]:
        """Test token refresh."""
        data = {"refresh_token": self.refresh_token}

        async with self.session.post(f"{API_BASE}/auth/refresh", json=data) as resp:
            result = await resp.json()
            if resp.status == 200:
                self.access_token = result["access_token"]
                self.refresh_token = result["refresh_token"]
                print("✅ Token refresh successful")
                return result
            else:
                print(f"❌ Token refresh failed: {result}")
                return result

    async def get_user_profile(self) -> Dict[str, Any]:
        """Test getting user profile."""
        headers = {"Authorization": f"Bearer {self.access_token}"}

        async with self.session.get(f"{API_BASE}/auth/me", headers=headers) as resp:
            result = await resp.json()
            if resp.status == 200:
                print("✅ User profile retrieved")
                return result
            else:
                print(f"❌ User profile failed: {result}")
                return result


async def main():
    """Run all auth tests."""
    print("🧪 Testing SalesFlow AI Auth System")
    print("=" * 50)

    tester = AuthTester()

    try:
        # Test 1: Signup
        print("\n1. Testing Signup...")
        signup_result = await tester.signup(
            "test@example.com",
            "testpassword123",
            "Test",
            "User"
        )

        if "access_token" not in signup_result:
            print("❌ Signup failed, stopping tests")
            return

        # Test 2: Login with same user
        print("\n2. Testing Login...")
        await tester.login("test@example.com", "testpassword123")

        # Test 3: Access protected endpoint
        print("\n3. Testing Protected Route Access...")
        await tester.get_protected_leads()

        # Test 4: Access without auth (should fail)
        print("\n4. Testing Unauthorized Access...")
        await tester.get_protected_leads_unauthorized()

        # Test 5: Token refresh
        print("\n5. Testing Token Refresh...")
        await tester.refresh_access_token()

        # Test 6: Still works after refresh
        print("\n6. Testing Protected Access After Refresh...")
        await tester.get_protected_leads()

        # Test 7: User profile
        print("\n7. Testing User Profile...")
        await tester.get_user_profile()

        print("\n🎉 All Auth Tests Completed!")

    finally:
        await tester.close()


if __name__ == "__main__":
    asyncio.run(main())
