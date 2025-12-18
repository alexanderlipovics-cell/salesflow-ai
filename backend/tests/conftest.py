"""
Pytest Configuration für SalesFlow AI Backend Tests.

Gemeinsame Fixtures und Konfiguration.
"""
import pytest
import asyncio
from typing import Generator, Any


# ============= Async Event Loop =============

@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, Any, None]:
    """Erstellt einen Event Loop für async Tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ============= Test Configuration =============

def pytest_configure(config):
    """Pytest Konfiguration."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )


# ============= Mock Fixtures =============

@pytest.fixture
def mock_supabase_client():
    """Mock Supabase Client für Tests."""
    class MockSupabase:
        def table(self, name):
            return MockTable()
    
    class MockTable:
        def select(self, *args):
            return self
        
        def insert(self, data):
            return self
        
        def update(self, data):
            return self
        
        def eq(self, col, val):
            return self
        
        def order(self, col, **kwargs):
            return self
        
        def limit(self, n):
            return self
        
        def execute(self):
            class MockResponse:
                data = []
            return MockResponse()
    
    return MockSupabase()


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI Client für Tests."""
    class MockOpenAI:
        class chat:
            class completions:
                @staticmethod
                async def create(**kwargs):
                    class MockChoice:
                        class message:
                            content = '{"text": "Test response"}'
                    
                    class MockUsage:
                        prompt_tokens = 100
                        completion_tokens = 50
                        total_tokens = 150
                    
                    class MockResponse:
                        choices = [MockChoice()]
                        usage = MockUsage()
                    
                    return MockResponse()
    
    return MockOpenAI()


# ============= Test Data Fixtures =============

@pytest.fixture
def sample_user_data():
    """Sample User Daten für Tests."""
    return {
        "id": "test-user-123",
        "email": "test@example.com",
        "name": "Test User",
        "workspace_id": "workspace-123"
    }


@pytest.fixture
def sample_lead_data():
    """Sample Lead Daten für Tests."""
    return {
        "id": "lead-123",
        "first_name": "Max",
        "last_name": "Mustermann",
        "email": "max@example.com",
        "phone": "+49123456789",
        "source": "instagram",
        "status": "new",
        "score": 75,
        "tags": ["hot", "entrepreneur"]
    }


@pytest.fixture
def sample_team_member_data():
    """Sample Team Member Daten für Tests."""
    return {
        "id": "member-123",
        "name": "Anna Schmidt",
        "rank": "Distributor",
        "personal_volume": 500,
        "group_volume": 0,
        "is_active": True
    }

