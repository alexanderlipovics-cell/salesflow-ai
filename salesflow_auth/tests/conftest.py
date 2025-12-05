"""
SalesFlow AI - Pytest Configuration
Shared fixtures and configuration for tests
"""

import pytest
import os
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone


@pytest.fixture(scope="session", autouse=True)
def set_test_environment():
    """Set environment variables for all tests"""
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only-32chars"
    os.environ["JWT_REFRESH_SECRET_KEY"] = "test-refresh-secret-key-testing-32"
    os.environ["SUPABASE_URL"] = "https://test-project.supabase.co"
    os.environ["SUPABASE_SERVICE_KEY"] = "test-service-key"
    os.environ["SUPABASE_ANON_KEY"] = "test-anon-key"
    yield


@pytest.fixture
def mock_supabase_client():
    """
    Create a mock Supabase client for testing.
    Can be customized per test.
    """
    mock = MagicMock()
    
    # Default empty responses
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock.table.return_value.insert.return_value.execute.return_value.data = []
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value.data = []
    mock.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = []
    
    return mock


@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "testuser@salesflow.ai",
        "full_name": "Test User",
        "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.B3Q5GkC5zGJvKe",
        "role": "user",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


@pytest.fixture
def sample_admin_data():
    """Sample admin user data for testing"""
    return {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "email": "admin@salesflow.ai",
        "full_name": "Admin User",
        "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.B3Q5GkC5zGJvKe",
        "role": "admin",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


@pytest.fixture
def auth_headers(sample_user_data):
    """Generate valid auth headers for testing protected endpoints"""
    from app.core.auth import create_access_token
    from app.schemas.auth import UserRole
    
    token = create_access_token(
        user_id=sample_user_data["id"],
        email=sample_user_data["email"],
        role=UserRole.USER
    )
    
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(sample_admin_data):
    """Generate valid admin auth headers for testing"""
    from app.core.auth import create_access_token
    from app.schemas.auth import UserRole
    
    token = create_access_token(
        user_id=sample_admin_data["id"],
        email=sample_admin_data["email"],
        role=UserRole.ADMIN
    )
    
    return {"Authorization": f"Bearer {token}"}
