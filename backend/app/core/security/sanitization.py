"""
Input Sanitization Module for SalesFlow AI.

Provides protection against:
- XSS (Cross-Site Scripting)
- SQL Injection patterns
- Log injection
- Path traversal
- CRLF injection
"""
import html
import re
import unicodedata
from typing import Any, Callable, Optional, TypeVar, Union
from functools import wraps
import logging

from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar("T")


class SanitizationError(Exception):
    """Input sanitization failed."""
    pass


class SanitizationConfig(BaseModel):
    """Configuration for sanitization behavior."""
    strip_html: bool = True
    escape_html: bool = True
    strip_null_bytes: bool = True
    normalize_unicode: bool = True
    max_length: Optional[int] = None
    strip_control_chars: bool = True
    strip_sql_patterns: bool = True
    strip_path_traversal: bool = True
    strip_crlf: bool = True
    allowed_html_tags: list[str] = []


# Dangerous SQL patterns
SQL_INJECTION_PATTERNS = [
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)",
    r"(--|#|/\*|\*/)",
    r"(\bOR\b\s+\d+\s*=\s*\d+)",
    r"(\bAND\b\s+\d+\s*=\s*\d+)",
    r"(UNION\s+SELECT)",
    r"(;\s*DROP)",
    r"('\s*OR\s*')",
    r"(1\s*=\s*1)",
]

# Path traversal patterns
PATH_TRAVERSAL_PATTERNS = [
    r"\.\./",
    r"\.\.\\",
    r"%2e%2e%2f",
    r"%2e%2e/",
    r"\.\.%2f",
    r"%2e%2e%5c",
]

# Control characters (except common whitespace)
CONTROL_CHAR_PATTERN = re.compile(
    r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]"
)


def strip_html_tags(text: str, allowed_tags: list[str] = None) -> str:
    """
    Remove HTML tags from text.
    
    Args:
        text: Input text
        allowed_tags: List of tags to keep (e.g., ['b', 'i', 'em'])
    """
    if not allowed_tags:
        # Remove all tags
        return re.sub(r"<[^>]+>", "", text)
    
    # Keep only allowed tags
    allowed_pattern = "|".join(allowed_tags)
    pattern = f"<(?!/?(({allowed_pattern})\\b)[^>]*>)[^>]+>"
    return re.sub(pattern, "", text, flags=re.IGNORECASE)


def escape_html(text: str) -> str:
    """Escape HTML special characters."""
    return html.escape(text, quote=True)


def unescape_html(text: str) -> str:
    """Unescape HTML entities."""
    return html.unescape(text)


def strip_null_bytes(text: str) -> str:
    """Remove null bytes which can bypass validation."""
    return text.replace("\x00", "")


def normalize_unicode(text: str, form: str = "NFKC") -> str:
    """
    Normalize Unicode to prevent homoglyph attacks.
    
    NFKC normalization converts lookalike characters to their base form.
    """
    return unicodedata.normalize(form, text)


def strip_control_characters(text: str) -> str:
    """Remove control characters except common whitespace."""
    return CONTROL_CHAR_PATTERN.sub("", text)


def strip_crlf(text: str) -> str:
    """Remove CRLF characters to prevent header injection."""
    return text.replace("\r", "").replace("\n", " ")


def check_sql_injection(text: str) -> bool:
    """
    Check if text contains SQL injection patterns.
    
    Returns True if suspicious patterns found.
    """
    text_upper = text.upper()
    for pattern in SQL_INJECTION_PATTERNS:
        if re.search(pattern, text_upper, re.IGNORECASE):
            return True
    return False


def check_path_traversal(text: str) -> bool:
    """
    Check if text contains path traversal patterns.
    
    Returns True if suspicious patterns found.
    """
    text_lower = text.lower()
    for pattern in PATH_TRAVERSAL_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            return True
    return False


def sanitize_string(
    text: str,
    config: Optional[SanitizationConfig] = None
) -> str:
    """
    Sanitize a string according to configuration.
    
    Args:
        text: Input string
        config: Sanitization configuration
    
    Returns:
        Sanitized string
    """
    if not isinstance(text, str):
        return text
    
    config = config or SanitizationConfig()
    result = text
    
    # Strip null bytes first
    if config.strip_null_bytes:
        result = strip_null_bytes(result)
    
    # Normalize Unicode
    if config.normalize_unicode:
        result = normalize_unicode(result)
    
    # Strip control characters
    if config.strip_control_chars:
        result = strip_control_characters(result)
    
    # Strip CRLF
    if config.strip_crlf:
        result = strip_crlf(result)
    
    # Strip or escape HTML
    if config.strip_html:
        result = strip_html_tags(result, config.allowed_html_tags)
    elif config.escape_html:
        result = escape_html(result)
    
    # Check for SQL injection patterns
    if config.strip_sql_patterns and check_sql_injection(result):
        logger.warning(f"SQL injection pattern detected and blocked")
        raise SanitizationError("Invalid input: SQL pattern detected")
    
    # Check for path traversal
    if config.strip_path_traversal and check_path_traversal(result):
        logger.warning(f"Path traversal pattern detected and blocked")
        raise SanitizationError("Invalid input: path traversal detected")
    
    # Enforce max length
    if config.max_length and len(result) > config.max_length:
        result = result[:config.max_length]
    
    return result


def sanitize_dict(
    data: dict,
    config: Optional[SanitizationConfig] = None,
    recursive: bool = True
) -> dict:
    """
    Sanitize all string values in a dictionary.
    
    Args:
        data: Input dictionary
        config: Sanitization configuration
        recursive: Sanitize nested dicts/lists
    
    Returns:
        Sanitized dictionary
    """
    result = {}
    
    for key, value in data.items():
        if isinstance(value, str):
            result[key] = sanitize_string(value, config)
        elif isinstance(value, dict) and recursive:
            result[key] = sanitize_dict(value, config, recursive)
        elif isinstance(value, list) and recursive:
            result[key] = sanitize_list(value, config, recursive)
        else:
            result[key] = value
    
    return result


def sanitize_list(
    data: list,
    config: Optional[SanitizationConfig] = None,
    recursive: bool = True
) -> list:
    """Sanitize all string values in a list."""
    result = []
    
    for item in data:
        if isinstance(item, str):
            result.append(sanitize_string(item, config))
        elif isinstance(item, dict) and recursive:
            result.append(sanitize_dict(item, config, recursive))
        elif isinstance(item, list) and recursive:
            result.append(sanitize_list(item, config, recursive))
        else:
            result.append(item)
    
    return result


def sanitize_for_log(text: str, max_length: int = 200) -> str:
    """
    Sanitize text for safe logging.
    
    Prevents log injection and truncates long values.
    """
    if not isinstance(text, str):
        text = str(text)
    
    # Remove newlines and control characters
    result = strip_control_characters(text)
    result = result.replace("\n", "\\n").replace("\r", "\\r")
    
    # Truncate
    if len(result) > max_length:
        result = result[:max_length] + "..."
    
    return result


def sanitize_email(email: str) -> str:
    """
    Sanitize and validate email format.
    
    Returns sanitized email or raises SanitizationError.
    """
    email = email.strip().lower()
    email = strip_null_bytes(email)
    email = normalize_unicode(email)
    
    # Basic email pattern
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(pattern, email):
        raise SanitizationError("Invalid email format")
    
    return email


def sanitize_url(url: str) -> str:
    """
    Sanitize URL to prevent javascript: and data: schemes.
    
    Returns sanitized URL or raises SanitizationError.
    """
    url = url.strip()
    url_lower = url.lower()
    
    # Block dangerous schemes
    dangerous_schemes = ["javascript:", "data:", "vbscript:", "file:"]
    for scheme in dangerous_schemes:
        if url_lower.startswith(scheme):
            raise SanitizationError(f"Blocked URL scheme: {scheme}")
    
    return url


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal and special characters.
    
    Returns safe filename.
    """
    # Remove path separators
    filename = filename.replace("/", "_").replace("\\", "_")
    
    # Remove null bytes
    filename = strip_null_bytes(filename)
    
    # Remove control characters
    filename = strip_control_characters(filename)
    
    # Remove or replace dangerous characters
    filename = re.sub(r"[<>:\"|?*]", "_", filename)
    
    # Prevent path traversal
    if check_path_traversal(filename):
        filename = filename.replace("..", "_")
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        filename = name[:250] + ("." + ext if ext else "")
    
    return filename


def sanitize_model(model: BaseModel) -> BaseModel:
    """
    Sanitize all string fields in a Pydantic model.
    
    Returns new model instance with sanitized values.
    """
    data = model.model_dump()
    sanitized = sanitize_dict(data)
    return model.__class__(**sanitized)


def sanitize_input(
    config: Optional[SanitizationConfig] = None
) -> Callable:
    """
    Decorator to sanitize function inputs.
    
    Usage:
        @sanitize_input()
        def process_data(data: dict) -> dict:
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Sanitize string arguments
            sanitized_args = []
            for arg in args:
                if isinstance(arg, str):
                    sanitized_args.append(sanitize_string(arg, config))
                elif isinstance(arg, dict):
                    sanitized_args.append(sanitize_dict(arg, config))
                elif isinstance(arg, list):
                    sanitized_args.append(sanitize_list(arg, config))
                else:
                    sanitized_args.append(arg)
            
            # Sanitize keyword arguments
            sanitized_kwargs = {}
            for key, value in kwargs.items():
                if isinstance(value, str):
                    sanitized_kwargs[key] = sanitize_string(value, config)
                elif isinstance(value, dict):
                    sanitized_kwargs[key] = sanitize_dict(value, config)
                elif isinstance(value, list):
                    sanitized_kwargs[key] = sanitize_list(value, config)
                else:
                    sanitized_kwargs[key] = value
            
            return func(*sanitized_args, **sanitized_kwargs)
        
        return wrapper
    return decorator


class LogSanitizingFilter(logging.Filter):
    """
    Logging filter that sanitizes sensitive data.
    
    Add to your logging configuration to prevent
    secrets and PII from appearing in logs.
    """
    
    SENSITIVE_PATTERNS = [
        (r"password[\"']?\s*[:=]\s*[\"']?[^\"'\s]+", "password=***"),
        (r"token[\"']?\s*[:=]\s*[\"']?[^\"'\s]+", "token=***"),
        (r"api[_-]?key[\"']?\s*[:=]\s*[\"']?[^\"'\s]+", "api_key=***"),
        (r"secret[\"']?\s*[:=]\s*[\"']?[^\"'\s]+", "secret=***"),
        (r"authorization[\"']?\s*[:=]\s*[\"']?[^\"'\s]+", "authorization=***"),
        (r"bearer\s+[a-zA-Z0-9._-]+", "bearer ***"),
        (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[EMAIL]"),
    ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Sanitize log message."""
        if isinstance(record.msg, str):
            for pattern, replacement in self.SENSITIVE_PATTERNS:
                record.msg = re.sub(
                    pattern, replacement, record.msg, flags=re.IGNORECASE
                )
        return True
