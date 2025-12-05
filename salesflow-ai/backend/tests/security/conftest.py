"""
Pytest configuration for SalesFlow AI tests.
"""
import os
import sys
from pathlib import Path

import pytest

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set test environment variables
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only-32bytes")
os.environ.setdefault("JWT_REFRESH_SECRET_KEY", "test-refresh-secret-key-testing-32b")
os.environ.setdefault("ENCRYPTION_KEY", "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcw==")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_user_id():
    """Generate test user ID."""
    from uuid import uuid4
    return uuid4()


@pytest.fixture
def test_org_id():
    """Generate test organization ID."""
    from uuid import uuid4
    return uuid4()


@pytest.fixture
def auth_headers(test_user_id):
    """Generate authentication headers for testing."""
    # In real tests, generate actual JWT token
    return {
        "Authorization": "Bearer test-token",
        "X-Request-ID": "test-request-id"
    }
