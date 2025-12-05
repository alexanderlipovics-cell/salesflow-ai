"""
SalesFlow AI - Authentication Test Suite
Comprehensive tests for auth functionality
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from jose import jwt
import hashlib

# Import modules to test
from app.core.security import (
    hash_password,
    verify_password,
    generate_secure_token,
    hash_token,
    validate_password_strength,
)
from app.core.auth import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    SECRET_KEY,
    REFRESH_SECRET_KEY,
    ALGORITHM,
)
from app.schemas.auth import UserRole, TokenPayload


# ============================================================================
# Unit Tests: Security Module
# ============================================================================

class TestPasswordHashing:
    """Tests for password hashing functions"""
    
    def test_hash_password_returns_hash(self):
        """Password hashing should return a bcrypt hash"""
        password = "SecurePassword123!"
        hashed = hash_password(password)
        
        assert hashed is not None
        assert hashed != password
        assert hashed.startswith("$2b$")  # bcrypt identifier
    
    def test_hash_password_different_hashes(self):
        """Same password should produce different hashes (salt)"""
        password = "SecurePassword123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2  # Different salts
    
    def test_verify_password_correct(self):
        """Correct password should verify successfully"""
        password = "SecurePassword123!"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Incorrect password should fail verification"""
        password = "SecurePassword123!"
        hashed = hash_password(password)
        
        assert verify_password("WrongPassword123!", hashed) is False
    
    def test_verify_password_empty(self):
        """Empty password should fail verification"""
        hashed = hash_password("SecurePassword123!")
        
        assert verify_password("", hashed) is False


class TestPasswordValidation:
    """Tests for password strength validation"""
    
    def test_valid_password(self):
        """Valid password should pass validation"""
        is_valid, error = validate_password_strength("SecurePass123!")
        assert is_valid is True
        assert error is None
    
    def test_password_too_short(self):
        """Short password should fail"""
        is_valid, error = validate_password_strength("Short1!")
        assert is_valid is False
        assert "8 characters" in error
    
    def test_password_too_long(self):
        """Overly long password should fail"""
        is_valid, error = validate_password_strength("A" * 129)
        assert is_valid is False
        assert "128 characters" in error
    
    def test_password_no_uppercase(self):
        """Password without uppercase should fail"""
        is_valid, error = validate_password_strength("lowercase123!")
        assert is_valid is False
        assert "uppercase" in error.lower()
    
    def test_password_no_lowercase(self):
        """Password without lowercase should fail"""
        is_valid, error = validate_password_strength("UPPERCASE123!")
        assert is_valid is False
        assert "lowercase" in error.lower()
    
    def test_password_no_digit(self):
        """Password without digit should fail"""
        is_valid, error = validate_password_strength("NoDigitsHere!")
        assert is_valid is False
        assert "numeric" in error.lower()


class TestTokenGeneration:
    """Tests for secure token generation"""
    
    def test_generate_secure_token_length(self):
        """Token should have correct length"""
        token = generate_secure_token(32)
        assert len(token) == 64  # 32 bytes = 64 hex chars
    
    def test_generate_secure_token_unique(self):
        """Tokens should be unique"""
        tokens = [generate_secure_token() for _ in range(100)]
        assert len(set(tokens)) == 100
    
    def test_hash_token_consistent(self):
        """Same token should produce same hash"""
        token = "test_token_123"
        hash1 = hash_token(token)
        hash2 = hash_token(token)
        assert hash1 == hash2
    
    def test_hash_token_different_tokens(self):
        """Different tokens should produce different hashes"""
        hash1 = hash_token("token1")
        hash2 = hash_token("token2")
        assert hash1 != hash2


# ============================================================================
# Unit Tests: JWT Module
# ============================================================================

class TestAccessToken:
    """Tests for access token creation and validation"""
    
    def test_create_access_token(self):
        """Access token should be created successfully"""
        token = create_access_token(
            user_id="user-123",
            email="test@example.com",
            role=UserRole.USER
        )
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_access_token_contains_claims(self):
        """Access token should contain correct claims"""
        user_id = "user-123"
        email = "test@example.com"
        role = UserRole.ADMIN
        
        token = create_access_token(
            user_id=user_id,
            email=email,
            role=role
        )
        
        # Decode without verification to check claims
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        assert payload["sub"] == user_id
        assert payload["email"] == email
        assert payload["role"] == role.value
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload
    
    def test_access_token_custom_expiry(self):
        """Access token should respect custom expiry"""
        custom_delta = timedelta(hours=1)
        token = create_access_token(
            user_id="user-123",
            email="test@example.com",
            role=UserRole.USER,
            expires_delta=custom_delta
        )
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        iat_time = datetime.fromtimestamp(payload["iat"], tz=timezone.utc)
        
        # Should be approximately 1 hour difference
        diff = exp_time - iat_time
        assert 3500 < diff.total_seconds() < 3700  # ~1 hour with tolerance
    
    def test_decode_access_token_valid(self):
        """Valid access token should decode successfully"""
        token = create_access_token(
            user_id="user-123",
            email="test@example.com",
            role=UserRole.USER
        )
        
        payload = decode_access_token(token)
        
        assert payload is not None
        assert payload.sub == "user-123"
        assert payload.email == "test@example.com"
        assert payload.role == UserRole.USER
    
    def test_decode_access_token_invalid(self):
        """Invalid access token should return None"""
        payload = decode_access_token("invalid.token.here")
        assert payload is None
    
    def test_decode_access_token_wrong_type(self):
        """Refresh token should not decode as access token"""
        refresh_token, _ = create_refresh_token(user_id="user-123")
        payload = decode_access_token(refresh_token)
        assert payload is None


class TestRefreshToken:
    """Tests for refresh token creation and validation"""
    
    def test_create_refresh_token(self):
        """Refresh token should be created successfully"""
        token, expires = create_refresh_token(user_id="user-123")
        
        assert token is not None
        assert isinstance(token, str)
        assert expires > datetime.now(timezone.utc)
    
    def test_refresh_token_expiry(self):
        """Refresh token should have correct default expiry (30 days)"""
        token, expires = create_refresh_token(user_id="user-123")
        
        expected_expiry = datetime.now(timezone.utc) + timedelta(days=30)
        diff = abs((expires - expected_expiry).total_seconds())
        
        assert diff < 60  # Within 1 minute tolerance
    
    def test_decode_refresh_token_valid(self):
        """Valid refresh token should decode successfully"""
        token, _ = create_refresh_token(user_id="user-123")
        payload = decode_refresh_token(token)
        
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["type"] == "refresh"
    
    def test_decode_refresh_token_invalid(self):
        """Invalid refresh token should return None"""
        payload = decode_refresh_token("invalid.token.here")
        assert payload is None


class TestTokenExpiration:
    """Tests for token expiration handling"""
    
    def test_expired_access_token(self):
        """Expired access token should raise ExpiredSignatureError"""
        from jose import ExpiredSignatureError
        
        token = create_access_token(
            user_id="user-123",
            email="test@example.com",
            role=UserRole.USER,
            expires_delta=timedelta(seconds=-1)  # Already expired
        )
        
        with pytest.raises(ExpiredSignatureError):
            decode_access_token(token)
    
    def test_expired_refresh_token(self):
        """Expired refresh token should raise ExpiredSignatureError"""
        from jose import ExpiredSignatureError
        
        token, _ = create_refresh_token(
            user_id="user-123",
            expires_delta=timedelta(seconds=-1)  # Already expired
        )
        
        with pytest.raises(ExpiredSignatureError):
            decode_refresh_token(token)


# ============================================================================
# Integration Tests: Auth Endpoints (Mock DB)
# ============================================================================

class TestAuthEndpoints:
    """Integration tests for auth endpoints with mocked database"""
    
    @pytest.fixture
    def mock_supabase(self):
        """Create mock Supabase client"""
        mock = MagicMock()
        return mock
    
    @pytest.fixture
    def client(self, mock_supabase):
        """Create test client with mocked dependencies"""
        from fastapi import FastAPI
        from app.routers.auth import router
        
        app = FastAPI()
        app.include_router(router)
        
        with patch('app.routers.auth.get_supabase_client', return_value=mock_supabase):
            with patch('app.core.deps.get_supabase_client', return_value=mock_supabase):
                yield TestClient(app)
    
    def test_signup_success(self, client, mock_supabase):
        """Successful signup should return tokens and user"""
        # Mock: email doesn't exist
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        # Mock: user creation succeeds
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{"id": "new-user-id"}]
        
        response = client.post("/auth/signup", json={
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "full_name": "New User"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert "tokens" in data
        assert "user" in data
        assert data["tokens"]["token_type"] == "bearer"
    
    def test_signup_duplicate_email(self, client, mock_supabase):
        """Signup with existing email should fail"""
        # Mock: email exists
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": "existing"}]
        
        response = client.post("/auth/signup", json={
            "email": "existing@example.com",
            "password": "SecurePass123!",
            "full_name": "Test User"
        })
        
        assert response.status_code == 409
        assert "already registered" in response.json()["detail"]
    
    def test_signup_weak_password(self, client, mock_supabase):
        """Signup with weak password should fail validation"""
        # Mock: email doesn't exist
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.post("/auth/signup", json={
            "email": "newuser@example.com",
            "password": "weak",  # Too short, no uppercase, no digit
            "full_name": "Test User"
        })
        
        assert response.status_code == 422  # Pydantic validation error
    
    def test_login_success(self, client, mock_supabase):
        """Successful login should return tokens"""
        # Mock: user exists with correct password
        hashed = hash_password("SecurePass123!")
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{
            "id": "user-123",
            "email": "user@example.com",
            "full_name": "Test User",
            "hashed_password": hashed,
            "role": "user",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }]
        
        response = client.post("/auth/login", json={
            "email": "user@example.com",
            "password": "SecurePass123!"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "tokens" in data
        assert "user" in data
    
    def test_login_invalid_credentials(self, client, mock_supabase):
        """Login with wrong password should fail"""
        # Mock: user exists
        hashed = hash_password("CorrectPassword123!")
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{
            "id": "user-123",
            "email": "user@example.com",
            "hashed_password": hashed,
            "role": "user",
            "is_active": True
        }]
        
        response = client.post("/auth/login", json={
            "email": "user@example.com",
            "password": "WrongPassword123!"
        })
        
        assert response.status_code == 401
    
    def test_login_user_not_found(self, client, mock_supabase):
        """Login with non-existent email should fail"""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.post("/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "SomePassword123!"
        })
        
        assert response.status_code == 401
    
    def test_login_inactive_user(self, client, mock_supabase):
        """Login for inactive user should fail"""
        hashed = hash_password("SecurePass123!")
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{
            "id": "user-123",
            "email": "user@example.com",
            "hashed_password": hashed,
            "role": "user",
            "is_active": False  # Deactivated
        }]
        
        response = client.post("/auth/login", json={
            "email": "user@example.com",
            "password": "SecurePass123!"
        })
        
        assert response.status_code == 403


# ============================================================================
# Rate Limiting Tests
# ============================================================================

class TestRateLimiting:
    """Tests for login rate limiting"""
    
    @pytest.fixture
    def rate_limiter(self):
        """Create fresh rate limiter for each test"""
        from app.core.deps import RateLimiter
        return RateLimiter(max_attempts=3, window_seconds=60)
    
    @pytest.mark.asyncio
    async def test_rate_limit_allows_initial_requests(self, rate_limiter):
        """Should allow requests within limit"""
        result = await rate_limiter.check_rate_limit("test-ip")
        assert result is True
    
    @pytest.mark.asyncio
    async def test_rate_limit_blocks_after_max(self, rate_limiter):
        """Should block after max attempts"""
        for _ in range(3):
            await rate_limiter.check_rate_limit("test-ip")
        
        result = await rate_limiter.check_rate_limit("test-ip")
        assert result is False
    
    @pytest.mark.asyncio
    async def test_rate_limit_per_ip(self, rate_limiter):
        """Rate limits should be per-IP"""
        for _ in range(3):
            await rate_limiter.check_rate_limit("ip-1")
        
        # Different IP should still be allowed
        result = await rate_limiter.check_rate_limit("ip-2")
        assert result is True
    
    @pytest.mark.asyncio
    async def test_rate_limit_reset(self, rate_limiter):
        """Reset should clear attempts"""
        for _ in range(3):
            await rate_limiter.check_rate_limit("test-ip")
        
        rate_limiter.reset("test-ip")
        
        result = await rate_limiter.check_rate_limit("test-ip")
        assert result is True
    
    def test_remaining_attempts(self, rate_limiter):
        """Should correctly report remaining attempts"""
        assert rate_limiter.get_remaining_attempts("test-ip") == 3


# ============================================================================
# Edge Case Tests
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and security scenarios"""
    
    def test_token_tampering_detection(self):
        """Tampered token should fail validation"""
        token = create_access_token(
            user_id="user-123",
            email="test@example.com",
            role=UserRole.USER
        )
        
        # Tamper with the token
        parts = token.split(".")
        parts[1] = parts[1][:-4] + "XXXX"  # Modify payload
        tampered = ".".join(parts)
        
        payload = decode_access_token(tampered)
        assert payload is None
    
    def test_wrong_secret_key(self):
        """Token signed with wrong key should fail"""
        # Create token with different secret
        payload = {
            "sub": "user-123",
            "email": "test@example.com",
            "role": "user",
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1)
        }
        token = jwt.encode(payload, "wrong-secret-key", algorithm=ALGORITHM)
        
        result = decode_access_token(token)
        assert result is None
    
    def test_sql_injection_in_email(self):
        """SQL injection attempts should be handled safely"""
        from app.schemas.auth import UserLoginRequest
        
        # Pydantic's EmailStr should reject this
        with pytest.raises(Exception):
            UserLoginRequest(
                email="'; DROP TABLE users; --",
                password="password"
            )
    
    def test_xss_in_full_name(self):
        """XSS attempts in name should be stored as-is (escaped on output)"""
        from app.schemas.auth import UserSignupRequest
        
        # This should be accepted but escaped when rendered
        request = UserSignupRequest(
            email="test@example.com",
            password="SecurePass123!",
            full_name="<script>alert('xss')</script>"
        )
        
        assert "<script>" in request.full_name  # Stored as-is
    
    def test_unicode_password(self):
        """Unicode passwords should work correctly"""
        password = "Sëcürë123!🔐"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
        assert verify_password("Secure123!", hashed) is False


# ============================================================================
# Test Configuration
# ============================================================================

@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    """Set up test environment variables"""
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
    monkeypatch.setenv("JWT_REFRESH_SECRET_KEY", "test-refresh-secret-key-for-testing")
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "test-service-key")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
