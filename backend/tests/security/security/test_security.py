"""
Security Tests for SalesFlow AI.

Comprehensive test suite for all security components.
"""
import base64
import os
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from uuid import uuid4


# ============= Fixtures =============

@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    with patch("app.core.config.get_settings") as mock:
        settings = MagicMock()
        settings.JWT_SECRET_KEY = base64.urlsafe_b64encode(os.urandom(32)).decode()
        settings.JWT_REFRESH_SECRET_KEY = base64.urlsafe_b64encode(os.urandom(32)).decode()
        settings.JWT_ALGORITHM = "HS256"
        settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 30
        settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7
        settings.PASSWORD_MIN_LENGTH = 12
        settings.PASSWORD_REQUIRE_UPPERCASE = True
        settings.PASSWORD_REQUIRE_LOWERCASE = True
        settings.PASSWORD_REQUIRE_DIGIT = True
        settings.PASSWORD_REQUIRE_SPECIAL = True
        settings.password_bcrypt_rounds = 4  # Fast for testing
        settings.ENCRYPTION_KEY = base64.urlsafe_b64encode(os.urandom(32)).decode()
        settings.ENVIRONMENT = "development"
        mock.return_value = settings
        yield settings


@pytest.fixture
def user_id():
    return uuid4()


@pytest.fixture
def org_id():
    return uuid4()


# ============= JWT Tests =============

class TestJWT:
    """Tests for JWT token handling."""
    
    def test_create_access_token(self, mock_settings, user_id):
        """Test access token creation."""
        from app.core.security.jwt import create_access_token, decode_access_token
        
        token, jti = create_access_token(user_id, "user")
        
        assert token is not None
        assert jti is not None
        assert len(token) > 100  # JWT tokens are long
        
        # Verify we can decode it
        payload = decode_access_token(token)
        assert payload.sub == str(user_id)
        assert payload.role == "user"
        assert payload.jti == jti
    
    def test_create_refresh_token(self, mock_settings, user_id, org_id):
        """Test refresh token creation."""
        from app.core.security.jwt import create_refresh_token, decode_refresh_token
        
        token, jti, family_id = create_refresh_token(user_id, "admin", org_id)
        
        assert token is not None
        assert jti is not None
        assert family_id is not None
        
        payload = decode_refresh_token(token)
        assert payload.sub == str(user_id)
        assert payload.role == "admin"
        assert payload.org_id == str(org_id)
        assert payload.family_id == family_id
    
    def test_token_pair_creation(self, mock_settings, user_id):
        """Test creating token pair."""
        from app.core.security.jwt import create_token_pair
        
        pair = create_token_pair(user_id, "user")
        
        assert pair.access_token is not None
        assert pair.refresh_token is not None
        assert pair.token_type == "bearer"
        assert pair.expires_in == 30 * 60  # 30 minutes in seconds
    
    def test_access_token_expiration(self, mock_settings, user_id):
        """Test that expired tokens are rejected."""
        from app.core.security.jwt import (
            create_access_token,
            decode_access_token,
            TokenExpiredError
        )
        
        # Create token that's already expired
        with patch("app.core.security.jwt.datetime") as mock_dt:
            mock_dt.now.return_value = datetime.now(timezone.utc) - timedelta(hours=1)
            mock_dt.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            token, _ = create_access_token(user_id, "user")
        
        with pytest.raises(TokenExpiredError):
            decode_access_token(token)
    
    def test_token_blacklisting(self, mock_settings, user_id):
        """Test token revocation."""
        from app.core.security.jwt import (
            create_access_token,
            decode_access_token,
            revoke_token,
            token_blacklist,
            TokenBlacklistedError,
            TokenType
        )
        
        # Clear blacklist
        token_blacklist._blacklist.clear()
        
        token, jti = create_access_token(user_id, "user")
        
        # Token works before revocation
        payload = decode_access_token(token)
        assert payload.jti == jti
        
        # Revoke token
        revoke_token(token, TokenType.ACCESS)
        
        # Token should be rejected
        with pytest.raises(TokenBlacklistedError):
            decode_access_token(token)
    
    def test_refresh_token_rotation(self, mock_settings, user_id):
        """Test refresh token rotation."""
        from app.core.security.jwt import (
            create_refresh_token,
            rotate_refresh_token,
            decode_refresh_token,
            token_blacklist,
            TokenBlacklistedError
        )
        
        # Clear blacklist
        token_blacklist._blacklist.clear()
        
        # Create initial refresh token
        token1, jti1, family_id = create_refresh_token(user_id, "user")
        
        # Rotate token
        new_pair = rotate_refresh_token(token1)
        
        # Old token should be blacklisted
        with pytest.raises(TokenBlacklistedError):
            decode_refresh_token(token1)
        
        # New refresh token should work and have same family
        payload = decode_refresh_token(new_pair.refresh_token)
        assert payload.family_id == family_id
    
    def test_invalid_token_rejected(self, mock_settings):
        """Test that invalid tokens are rejected."""
        from app.core.security.jwt import decode_access_token, TokenInvalidError
        
        with pytest.raises(TokenInvalidError):
            decode_access_token("invalid.token.here")
        
        with pytest.raises(TokenInvalidError):
            decode_access_token("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature")
    
    def test_wrong_token_type_rejected(self, mock_settings, user_id):
        """Test that using wrong token type is rejected."""
        from app.core.security.jwt import (
            create_refresh_token,
            decode_access_token,
            TokenInvalidError
        )
        
        # Create refresh token
        refresh_token, _, _ = create_refresh_token(user_id, "user")
        
        # Try to use as access token
        with pytest.raises(TokenInvalidError):
            decode_access_token(refresh_token)


# ============= Password Tests =============

class TestPassword:
    """Tests for password handling."""
    
    def test_password_hashing(self, mock_settings):
        """Test password hashing and verification."""
        from app.core.security.password import hash_password, verify_password
        
        password = "SecureP@ssw0rd123!"
        hashed = hash_password(password)
        
        assert hashed != password
        assert hashed.startswith("$2b$")  # bcrypt prefix
        assert verify_password(password, hashed)
        assert not verify_password("wrong_password", hashed)
    
    def test_password_validation_length(self, mock_settings):
        """Test password length validation."""
        from app.core.security.password import validate_password
        
        # Too short
        violations = validate_password("Short1!")
        assert any("at least 12 characters" in v for v in violations)
        
        # Long enough
        violations = validate_password("LongEnoughP@ss1")
        assert not any("at least 12 characters" in v for v in violations)
    
    def test_password_validation_complexity(self, mock_settings):
        """Test password complexity requirements."""
        from app.core.security.password import validate_password
        
        # Missing uppercase
        violations = validate_password("lowercase1234!")
        assert any("uppercase" in v for v in violations)
        
        # Missing lowercase
        violations = validate_password("UPPERCASE1234!")
        assert any("lowercase" in v for v in violations)
        
        # Missing digit
        violations = validate_password("NoDigitsHere!!")
        assert any("digit" in v for v in violations)
        
        # Missing special
        violations = validate_password("NoSpecialChar1")
        assert any("special" in v for v in violations)
        
        # Valid password
        violations = validate_password("ValidP@ssw0rd!")
        assert len(violations) == 0
    
    def test_password_common_rejection(self, mock_settings):
        """Test common password rejection."""
        from app.core.security.password import validate_password
        
        violations = validate_password("password")
        assert any("common" in v.lower() for v in violations)
    
    def test_password_user_info_prevention(self, mock_settings):
        """Test that passwords can't contain user info."""
        from app.core.security.password import validate_password
        
        # Contains email
        violations = validate_password(
            "JohnDoe@1234!",
            email="johndoe@example.com"
        )
        assert any("email" in v.lower() for v in violations)
    
    def test_password_generation(self, mock_settings):
        """Test secure password generation."""
        from app.core.security.password import generate_password, validate_password
        
        password = generate_password(16)
        
        assert len(password) == 16
        violations = validate_password(password)
        assert len(violations) == 0  # Generated password should be valid
    
    def test_account_lockout(self, mock_settings):
        """Test account lockout after failed attempts."""
        from app.core.security.password import LoginAttemptTracker
        
        tracker = LoginAttemptTracker(max_attempts=3, lockout_duration_minutes=5)
        identifier = "test_user"
        
        # First 3 attempts should not lock
        for i in range(3):
            tracker.record_attempt(identifier, success=False)
            is_locked, _ = tracker.is_locked(identifier)
            if i < 2:
                assert not is_locked
        
        # After 3rd failure, should be locked
        is_locked, seconds = tracker.is_locked(identifier)
        assert is_locked
        assert seconds > 0
    
    def test_successful_login_clears_attempts(self, mock_settings):
        """Test that successful login clears failed attempts."""
        from app.core.security.password import LoginAttemptTracker
        
        tracker = LoginAttemptTracker(max_attempts=3)
        identifier = "test_user"
        
        # 2 failed attempts
        tracker.record_attempt(identifier, success=False)
        tracker.record_attempt(identifier, success=False)
        
        # Successful login
        tracker.record_attempt(identifier, success=True)
        
        # Attempts should be cleared
        remaining = tracker.get_remaining_attempts(identifier)
        assert remaining == 3


# ============= Sanitization Tests =============

class TestSanitization:
    """Tests for input sanitization."""
    
    def test_html_stripping(self):
        """Test HTML tag removal."""
        from app.core.security.sanitization import sanitize_string, SanitizationConfig
        
        config = SanitizationConfig(strip_html=True)
        
        result = sanitize_string("<script>alert('xss')</script>Hello", config)
        assert "<script>" not in result
        assert "Hello" in result
    
    def test_html_escaping(self):
        """Test HTML character escaping."""
        from app.core.security.sanitization import sanitize_string, SanitizationConfig
        
        config = SanitizationConfig(strip_html=False, escape_html=True)
        
        result = sanitize_string("<div>Test</div>", config)
        assert "&lt;div&gt;" in result
    
    def test_sql_injection_detection(self):
        """Test SQL injection pattern detection."""
        from app.core.security.sanitization import check_sql_injection
        
        # Dangerous patterns
        assert check_sql_injection("'; DROP TABLE users; --")
        assert check_sql_injection("1 OR 1=1")
        assert check_sql_injection("UNION SELECT * FROM users")
        
        # Safe inputs
        assert not check_sql_injection("John Doe")
        assert not check_sql_injection("user@example.com")
    
    def test_sql_injection_blocking(self):
        """Test that SQL injection attempts are blocked."""
        from app.core.security.sanitization import (
            sanitize_string,
            SanitizationConfig,
            SanitizationError
        )
        
        config = SanitizationConfig(strip_sql_patterns=True)
        
        with pytest.raises(SanitizationError):
            sanitize_string("'; DROP TABLE users; --", config)
    
    def test_path_traversal_detection(self):
        """Test path traversal pattern detection."""
        from app.core.security.sanitization import check_path_traversal
        
        assert check_path_traversal("../../../etc/passwd")
        assert check_path_traversal("..\\..\\windows\\system32")
        assert check_path_traversal("%2e%2e%2f")
        
        assert not check_path_traversal("/normal/path/file.txt")
    
    def test_null_byte_removal(self):
        """Test null byte removal."""
        from app.core.security.sanitization import sanitize_string
        
        result = sanitize_string("file\x00.txt.exe")
        assert "\x00" not in result
    
    def test_email_sanitization(self):
        """Test email sanitization."""
        from app.core.security.sanitization import sanitize_email, SanitizationError
        
        # Valid email
        result = sanitize_email("  User@Example.COM  ")
        assert result == "user@example.com"
        
        # Invalid email
        with pytest.raises(SanitizationError):
            sanitize_email("not-an-email")
    
    def test_filename_sanitization(self):
        """Test filename sanitization."""
        from app.core.security.sanitization import sanitize_filename
        
        # Path traversal
        result = sanitize_filename("../../../etc/passwd")
        assert ".." not in result
        assert "/" not in result
        
        # Special characters
        result = sanitize_filename('file<>:"|?*.txt')
        assert "<" not in result
        assert ">" not in result
    
    def test_url_sanitization(self):
        """Test URL scheme blocking."""
        from app.core.security.sanitization import sanitize_url, SanitizationError
        
        # Dangerous schemes
        with pytest.raises(SanitizationError):
            sanitize_url("javascript:alert('xss')")
        
        with pytest.raises(SanitizationError):
            sanitize_url("data:text/html,<script>alert('xss')</script>")
        
        # Safe URL
        result = sanitize_url("https://example.com")
        assert result == "https://example.com"
    
    def test_dict_sanitization(self):
        """Test recursive dictionary sanitization."""
        from app.core.security.sanitization import sanitize_dict
        
        data = {
            "name": "<script>alert('xss')</script>John",
            "nested": {
                "value": "<b>Bold</b>"
            },
            "list": ["<i>italic</i>", "normal"]
        }
        
        result = sanitize_dict(data)
        
        assert "<script>" not in result["name"]
        assert "<b>" not in result["nested"]["value"]
        assert "<i>" not in result["list"][0]
    
    def test_log_sanitization(self):
        """Test log message sanitization."""
        from app.core.security.sanitization import sanitize_for_log
        
        # Newlines removed
        result = sanitize_for_log("line1\nline2\rline3")
        assert "\n" not in result
        assert "\r" not in result
        
        # Long strings truncated
        long_string = "x" * 300
        result = sanitize_for_log(long_string, max_length=100)
        assert len(result) <= 103  # 100 + "..."


# ============= Encryption Tests =============

class TestEncryption:
    """Tests for field-level encryption."""
    
    def test_encrypt_decrypt(self, mock_settings):
        """Test basic encryption and decryption."""
        from app.core.security.encryption import FieldEncryptor
        
        encryptor = FieldEncryptor(mock_settings.ENCRYPTION_KEY)
        
        plaintext = "sensitive data"
        ciphertext = encryptor.encrypt(plaintext)
        
        assert ciphertext.startswith("enc:")
        assert ciphertext != plaintext
        
        decrypted = encryptor.decrypt(ciphertext)
        assert decrypted == plaintext
    
    def test_deterministic_encryption(self, mock_settings):
        """Test deterministic encryption for searchable fields."""
        from app.core.security.encryption import FieldEncryptor
        
        encryptor = FieldEncryptor(mock_settings.ENCRYPTION_KEY)
        
        plaintext = "searchable@email.com"
        
        cipher1 = encryptor.encrypt_deterministic(plaintext)
        cipher2 = encryptor.encrypt_deterministic(plaintext)
        
        # Same input should produce same output
        assert cipher1 == cipher2
        assert cipher1.startswith("denc:")
    
    def test_already_encrypted_handling(self, mock_settings):
        """Test that already encrypted values aren't double-encrypted."""
        from app.core.security.encryption import FieldEncryptor
        
        encryptor = FieldEncryptor(mock_settings.ENCRYPTION_KEY)
        
        plaintext = "data"
        encrypted = encryptor.encrypt(plaintext)
        double_encrypted = encryptor.encrypt(encrypted)
        
        # Should not double-encrypt
        assert encrypted == double_encrypted
    
    def test_mask_field(self, mock_settings):
        """Test field masking."""
        from app.core.security.encryption import FieldEncryptor
        
        encryptor = FieldEncryptor(mock_settings.ENCRYPTION_KEY)
        
        # Phone number
        result = encryptor.mask("1234567890", visible_chars=4)
        assert result == "******7890"
        
        # Short value
        result = encryptor.mask("123", visible_chars=4)
        assert result == "***"
    
    def test_mask_email(self, mock_settings):
        """Test email masking."""
        from app.core.security.encryption import FieldEncryptor
        
        encryptor = FieldEncryptor(mock_settings.ENCRYPTION_KEY)
        
        result = encryptor.mask_email("john.doe@example.com")
        assert result == "jo******@example.com"
        
        # Short local part
        result = encryptor.mask_email("a@example.com")
        assert "@example.com" in result
    
    def test_mask_phone(self, mock_settings):
        """Test phone number masking."""
        from app.core.security.encryption import FieldEncryptor
        
        encryptor = FieldEncryptor(mock_settings.ENCRYPTION_KEY)
        
        result = encryptor.mask_phone("+1 (555) 123-4567")
        assert "4567" in result
        assert "555" not in result or "*" in result
    
    def test_wrong_key_fails(self, mock_settings):
        """Test that decryption with wrong key fails."""
        from app.core.security.encryption import FieldEncryptor, DecryptionError
        
        key1 = base64.urlsafe_b64encode(os.urandom(32)).decode()
        key2 = base64.urlsafe_b64encode(os.urandom(32)).decode()
        
        encryptor1 = FieldEncryptor(key1)
        encryptor2 = FieldEncryptor(key2)
        
        encrypted = encryptor1.encrypt("secret")
        
        with pytest.raises(DecryptionError):
            encryptor2.decrypt(encrypted)


# ============= Rate Limiting Tests =============

class TestRateLimiting:
    """Tests for rate limiting."""
    
    @pytest.mark.asyncio
    async def test_rate_limit_allows_under_limit(self):
        """Test that requests under limit are allowed."""
        from app.middleware.rate_limiter import SlidingWindowCounter
        
        counter = SlidingWindowCounter()
        key = "test_user"
        
        # First 5 requests should be allowed
        for i in range(5):
            allowed, remaining, _ = await counter.is_allowed(key, limit=10, window_seconds=60)
            assert allowed
            assert remaining == 10 - i - 1
    
    @pytest.mark.asyncio
    async def test_rate_limit_blocks_over_limit(self):
        """Test that requests over limit are blocked."""
        from app.middleware.rate_limiter import SlidingWindowCounter
        
        counter = SlidingWindowCounter()
        key = "test_user"
        limit = 5
        
        # Make requests up to limit
        for _ in range(limit):
            await counter.is_allowed(key, limit=limit, window_seconds=60)
        
        # Next request should be blocked
        allowed, remaining, retry_after = await counter.is_allowed(
            key, limit=limit, window_seconds=60
        )
        
        assert not allowed
        assert remaining == 0
        assert retry_after > 0
    
    def test_endpoint_category_detection(self):
        """Test endpoint category detection."""
        from app.middleware.rate_limiter import (
            get_endpoint_category,
            RateLimitCategory
        )
        
        assert get_endpoint_category("/auth/login", "POST") == RateLimitCategory.AUTH
        assert get_endpoint_category("/api/copilot/draft", "POST") == RateLimitCategory.AI
        assert get_endpoint_category("/api/leads/export", "GET") == RateLimitCategory.EXPORT
        assert get_endpoint_category("/api/leads", "POST") == RateLimitCategory.WRITE
        assert get_endpoint_category("/api/leads", "GET") == RateLimitCategory.API


# ============= Security Headers Tests =============

class TestSecurityHeaders:
    """Tests for security headers."""
    
    def test_csp_header_building(self):
        """Test CSP header construction."""
        from app.middleware.security_headers import SecurityHeadersConfig
        
        config = SecurityHeadersConfig()
        csp = config.build_csp_header()
        
        assert "default-src 'self'" in csp
        assert "script-src" in csp
        assert "frame-ancestors 'none'" in csp
    
    def test_hsts_header_building(self):
        """Test HSTS header construction."""
        from app.middleware.security_headers import SecurityHeadersConfig
        
        config = SecurityHeadersConfig(
            hsts_max_age=31536000,
            hsts_include_subdomains=True,
            hsts_preload=True
        )
        hsts = config.build_hsts_header()
        
        assert "max-age=31536000" in hsts
        assert "includeSubDomains" in hsts
        assert "preload" in hsts
    
    def test_permissions_policy_building(self):
        """Test Permissions-Policy header construction."""
        from app.middleware.security_headers import SecurityHeadersConfig
        
        config = SecurityHeadersConfig()
        policy = config.build_permissions_header()
        
        assert "camera=()" in policy
        assert "microphone=()" in policy
        assert "geolocation=()" in policy


# ============= Run Tests =============

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
