"""
Field-Level Encryption Module for SalesFlow AI.

Provides encryption for sensitive data fields like:
- Phone numbers
- Social security numbers
- Credit card numbers
- Personal addresses
"""
import base64
import hashlib
import os
import secrets
from typing import Optional, Union
import logging

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.config import get_settings

logger = logging.getLogger(__name__)


class EncryptionError(Exception):
    """Encryption operation failed."""
    pass


class DecryptionError(Exception):
    """Decryption operation failed."""
    pass


class FieldEncryptor:
    """
    Handles field-level encryption using Fernet (AES-128-CBC).
    
    Features:
    - Deterministic encryption option for searchable fields
    - Key rotation support
    - Automatic key derivation from master key
    """
    
    def __init__(self, master_key: Optional[str] = None):
        """
        Initialize encryptor with master key.
        
        Args:
            master_key: Base64-encoded 32-byte key, or None to use settings
        """
        if master_key is None:
            settings = get_settings()
            master_key = settings.ENCRYPTION_KEY
        
        self._master_key = master_key
        self._fernet = self._create_fernet(master_key)
        self._deterministic_key = self._derive_key(master_key, b"deterministic")
    
    def _create_fernet(self, key: str) -> Fernet:
        """Create Fernet instance from key."""
        try:
            # Ensure key is valid Fernet key (32 bytes, base64 encoded)
            key_bytes = base64.urlsafe_b64decode(key)
            if len(key_bytes) != 32:
                # Derive proper key from provided key
                key = self._derive_key(key, b"fernet")
            return Fernet(key.encode() if isinstance(key, str) else key)
        except Exception as e:
            raise EncryptionError(f"Invalid encryption key: {str(e)}")
    
    def _derive_key(self, master_key: str, purpose: bytes) -> str:
        """Derive a purpose-specific key from master key."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=purpose,
            iterations=100000,
        )
        key_bytes = kdf.derive(master_key.encode())
        return base64.urlsafe_b64encode(key_bytes).decode()
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a string value.
        
        Returns:
            Base64-encoded ciphertext with 'enc:' prefix
        """
        if not plaintext:
            return plaintext
        
        if self._is_encrypted(plaintext):
            return plaintext  # Already encrypted
        
        try:
            ciphertext = self._fernet.encrypt(plaintext.encode())
            return f"enc:{base64.urlsafe_b64encode(ciphertext).decode()}"
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise EncryptionError("Failed to encrypt data")
    
    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt a string value.
        
        Returns:
            Decrypted plaintext
        """
        if not ciphertext:
            return ciphertext
        
        if not self._is_encrypted(ciphertext):
            return ciphertext  # Not encrypted
        
        try:
            # Remove prefix and decode
            encoded = ciphertext[4:]  # Remove 'enc:'
            cipher_bytes = base64.urlsafe_b64decode(encoded)
            plaintext = self._fernet.decrypt(cipher_bytes)
            return plaintext.decode()
        except InvalidToken:
            logger.error("Decryption failed: invalid token")
            raise DecryptionError("Failed to decrypt data: invalid key or corrupted data")
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise DecryptionError("Failed to decrypt data")
    
    def encrypt_deterministic(self, plaintext: str) -> str:
        """
        Encrypt with deterministic output for searchable fields.
        
        Warning: Less secure than random encryption. Use only
        when you need to search on encrypted fields.
        
        Returns:
            Base64-encoded ciphertext with 'denc:' prefix
        """
        if not plaintext:
            return plaintext
        
        if self._is_deterministic_encrypted(plaintext):
            return plaintext
        
        try:
            # Use HMAC for deterministic encryption
            key_bytes = base64.urlsafe_b64decode(self._deterministic_key)
            hmac = hashlib.pbkdf2_hmac(
                'sha256',
                plaintext.encode(),
                key_bytes,
                iterations=10000
            )
            return f"denc:{base64.urlsafe_b64encode(hmac).decode()}"
        except Exception as e:
            logger.error(f"Deterministic encryption failed: {str(e)}")
            raise EncryptionError("Failed to encrypt data")
    
    def _is_encrypted(self, value: str) -> bool:
        """Check if value is encrypted."""
        return value.startswith("enc:")
    
    def _is_deterministic_encrypted(self, value: str) -> bool:
        """Check if value is deterministically encrypted."""
        return value.startswith("denc:")
    
    def is_encrypted(self, value: str) -> bool:
        """Check if value is encrypted (any type)."""
        return self._is_encrypted(value) or self._is_deterministic_encrypted(value)
    
    def mask(self, value: str, visible_chars: int = 4, mask_char: str = "*") -> str:
        """
        Mask a value showing only last N characters.
        
        E.g., "1234567890" -> "******7890"
        """
        if not value or len(value) <= visible_chars:
            return mask_char * len(value) if value else ""
        
        masked_length = len(value) - visible_chars
        return mask_char * masked_length + value[-visible_chars:]
    
    def mask_email(self, email: str) -> str:
        """
        Mask email showing partial local part and domain.
        
        E.g., "john.doe@example.com" -> "jo****@example.com"
        """
        if not email or "@" not in email:
            return self.mask(email)
        
        local, domain = email.rsplit("@", 1)
        if len(local) <= 2:
            masked_local = local[0] + "*" * (len(local) - 1)
        else:
            masked_local = local[:2] + "*" * (len(local) - 2)
        
        return f"{masked_local}@{domain}"
    
    def mask_phone(self, phone: str) -> str:
        """
        Mask phone number showing only last 4 digits.
        
        E.g., "+1234567890" -> "******7890"
        """
        # Remove non-digits for masking calculation
        digits = "".join(c for c in phone if c.isdigit())
        if len(digits) <= 4:
            return "*" * len(phone)
        
        # Keep formatting, mask middle
        result = []
        visible_count = 0
        for i, char in enumerate(reversed(phone)):
            if char.isdigit():
                if visible_count < 4:
                    result.append(char)
                    visible_count += 1
                else:
                    result.append("*")
            else:
                result.append(char)
        
        return "".join(reversed(result))


# Global encryptor instance
_encryptor: Optional[FieldEncryptor] = None


def get_encryptor() -> FieldEncryptor:
    """Get or create the global encryptor instance."""
    global _encryptor
    if _encryptor is None:
        _encryptor = FieldEncryptor()
    return _encryptor


def encrypt_field(value: str) -> str:
    """Encrypt a field value."""
    return get_encryptor().encrypt(value)


def decrypt_field(value: str) -> str:
    """Decrypt a field value."""
    return get_encryptor().decrypt(value)


def encrypt_deterministic(value: str) -> str:
    """Encrypt a field with deterministic output."""
    return get_encryptor().encrypt_deterministic(value)


def mask_field(value: str, visible_chars: int = 4) -> str:
    """Mask a field value."""
    return get_encryptor().mask(value, visible_chars)


def mask_email(email: str) -> str:
    """Mask an email address."""
    return get_encryptor().mask_email(email)


def mask_phone(phone: str) -> str:
    """Mask a phone number."""
    return get_encryptor().mask_phone(phone)


class EncryptedField:
    """
    Descriptor for automatic field encryption in models.
    
    Usage:
        class User(BaseModel):
            phone: str = EncryptedField()
    """
    
    def __init__(self, deterministic: bool = False):
        self.deterministic = deterministic
        self.name = None
    
    def __set_name__(self, owner, name):
        self.name = name
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        value = obj.__dict__.get(self.name)
        if value and get_encryptor().is_encrypted(value):
            return get_encryptor().decrypt(value)
        return value
    
    def __set__(self, obj, value):
        if value and not get_encryptor().is_encrypted(value):
            if self.deterministic:
                value = get_encryptor().encrypt_deterministic(value)
            else:
                value = get_encryptor().encrypt(value)
        obj.__dict__[self.name] = value


def generate_encryption_key() -> str:
    """Generate a new encryption key."""
    return base64.urlsafe_b64encode(os.urandom(32)).decode()


def rotate_encryption_key(
    old_key: str,
    new_key: str,
    data: dict
) -> dict:
    """
    Rotate encryption key for a data dictionary.
    
    Decrypts with old key and re-encrypts with new key.
    """
    old_encryptor = FieldEncryptor(old_key)
    new_encryptor = FieldEncryptor(new_key)
    
    result = {}
    for key, value in data.items():
        if isinstance(value, str) and old_encryptor.is_encrypted(value):
            plaintext = old_encryptor.decrypt(value)
            result[key] = new_encryptor.encrypt(plaintext)
        elif isinstance(value, dict):
            result[key] = rotate_encryption_key(old_key, new_key, value)
        else:
            result[key] = value
    
    return result
