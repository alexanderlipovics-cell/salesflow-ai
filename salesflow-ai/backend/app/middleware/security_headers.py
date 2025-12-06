"""
Security Headers Middleware for SalesFlow AI.

Implements comprehensive security headers:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- Referrer-Policy
- Permissions-Policy
"""
from typing import Callable, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings


class SecurityHeadersConfig:
    """Configuration for security headers."""
    
    def __init__(
        self,
        # Content Security Policy
        csp_enabled: bool = True,
        csp_report_only: bool = False,
        csp_directives: Optional[dict[str, str]] = None,
        
        # Frame protection
        frame_options: str = "DENY",  # DENY, SAMEORIGIN, or None
        
        # Content type sniffing
        content_type_options: bool = True,
        
        # XSS protection (legacy, but still useful)
        xss_protection: bool = True,
        
        # HSTS
        hsts_enabled: bool = True,
        hsts_max_age: int = 31536000,  # 1 year
        hsts_include_subdomains: bool = True,
        hsts_preload: bool = False,
        
        # Referrer
        referrer_policy: str = "strict-origin-when-cross-origin",
        
        # Permissions/Feature Policy
        permissions_policy_enabled: bool = True,
        permissions_policy: Optional[dict[str, str]] = None,
        
        # Cache control for sensitive pages
        cache_control: str = "no-store, max-age=0",
        
        # Cross-Origin policies
        cross_origin_embedder_policy: Optional[str] = None,  # require-corp
        cross_origin_opener_policy: str = "same-origin",
        cross_origin_resource_policy: str = "same-origin",
    ):
        self.csp_enabled = csp_enabled
        self.csp_report_only = csp_report_only
        self.csp_directives = csp_directives or self._default_csp()
        
        self.frame_options = frame_options
        self.content_type_options = content_type_options
        self.xss_protection = xss_protection
        
        self.hsts_enabled = hsts_enabled
        self.hsts_max_age = hsts_max_age
        self.hsts_include_subdomains = hsts_include_subdomains
        self.hsts_preload = hsts_preload
        
        self.referrer_policy = referrer_policy
        
        self.permissions_policy_enabled = permissions_policy_enabled
        self.permissions_policy = permissions_policy or self._default_permissions()
        
        self.cache_control = cache_control
        
        self.cross_origin_embedder_policy = cross_origin_embedder_policy
        self.cross_origin_opener_policy = cross_origin_opener_policy
        self.cross_origin_resource_policy = cross_origin_resource_policy
    
    def _default_csp(self) -> dict[str, str]:
        """Default Content Security Policy directives."""
        return {
            "default-src": "'self'",
            "script-src": "'self'",
            "style-src": "'self' 'unsafe-inline'",  # Allow inline styles for UI
            "img-src": "'self' data: https:",
            "font-src": "'self'",
            "connect-src": "'self'",
            "frame-ancestors": "'none'",
            "form-action": "'self'",
            "base-uri": "'self'",
            "object-src": "'none'",
            "upgrade-insecure-requests": "",
        }
    
    def _default_permissions(self) -> dict[str, str]:
        """Default Permissions-Policy directives."""
        return {
            "accelerometer": "()",
            "camera": "()",
            "geolocation": "()",
            "gyroscope": "()",
            "magnetometer": "()",
            "microphone": "()",
            "payment": "()",
            "usb": "()",
            "interest-cohort": "()",  # Disable FLoC
        }
    
    def build_csp_header(self) -> str:
        """Build CSP header value."""
        parts = []
        for directive, value in self.csp_directives.items():
            if value:
                parts.append(f"{directive} {value}")
            else:
                parts.append(directive)
        return "; ".join(parts)
    
    def build_hsts_header(self) -> str:
        """Build HSTS header value."""
        parts = [f"max-age={self.hsts_max_age}"]
        if self.hsts_include_subdomains:
            parts.append("includeSubDomains")
        if self.hsts_preload:
            parts.append("preload")
        return "; ".join(parts)
    
    def build_permissions_header(self) -> str:
        """Build Permissions-Policy header value."""
        parts = []
        for feature, value in self.permissions_policy.items():
            parts.append(f"{feature}={value}")
        return ", ".join(parts)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    
    Usage:
        app.add_middleware(SecurityHeadersMiddleware)
    """
    
    def __init__(
        self,
        app,
        config: Optional[SecurityHeadersConfig] = None,
        exclude_paths: Optional[list[str]] = None
    ):
        super().__init__(app)
        self.config = config or SecurityHeadersConfig()
        self.exclude_paths = exclude_paths or []
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add security headers to response."""
        response = await call_next(request)
        
        # Skip excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return response
        
        # Content Security Policy
        if self.config.csp_enabled:
            csp_header = "Content-Security-Policy-Report-Only" if self.config.csp_report_only else "Content-Security-Policy"
            response.headers[csp_header] = self.config.build_csp_header()
        
        # X-Frame-Options
        if self.config.frame_options:
            response.headers["X-Frame-Options"] = self.config.frame_options
        
        # X-Content-Type-Options
        if self.config.content_type_options:
            response.headers["X-Content-Type-Options"] = "nosniff"
        
        # X-XSS-Protection (legacy but still useful)
        if self.config.xss_protection:
            response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Strict-Transport-Security (HSTS)
        if self.config.hsts_enabled:
            response.headers["Strict-Transport-Security"] = self.config.build_hsts_header()
        
        # Referrer-Policy
        if self.config.referrer_policy:
            response.headers["Referrer-Policy"] = self.config.referrer_policy
        
        # Permissions-Policy
        if self.config.permissions_policy_enabled:
            response.headers["Permissions-Policy"] = self.config.build_permissions_header()
        
        # Cache-Control for API responses
        if self.config.cache_control and "Cache-Control" not in response.headers:
            response.headers["Cache-Control"] = self.config.cache_control
            response.headers["Pragma"] = "no-cache"
        
        # Cross-Origin policies
        if self.config.cross_origin_embedder_policy:
            response.headers["Cross-Origin-Embedder-Policy"] = self.config.cross_origin_embedder_policy
        
        if self.config.cross_origin_opener_policy:
            response.headers["Cross-Origin-Opener-Policy"] = self.config.cross_origin_opener_policy
        
        if self.config.cross_origin_resource_policy:
            response.headers["Cross-Origin-Resource-Policy"] = self.config.cross_origin_resource_policy
        
        # Remove potentially dangerous headers (safely, as MutableHeaders has no pop())
        if "Server" in response.headers:
            del response.headers["Server"]
        if "X-Powered-By" in response.headers:
            del response.headers["X-Powered-By"]
        
        return response


def get_production_config() -> SecurityHeadersConfig:
    """Get security headers configuration for production."""
    return SecurityHeadersConfig(
        csp_enabled=True,
        csp_report_only=False,
        hsts_enabled=True,
        hsts_max_age=31536000,
        hsts_include_subdomains=True,
        hsts_preload=True,
        frame_options="DENY",
        referrer_policy="strict-origin-when-cross-origin",
    )


def get_development_config() -> SecurityHeadersConfig:
    """Get security headers configuration for development."""
    return SecurityHeadersConfig(
        csp_enabled=True,
        csp_report_only=True,  # Report only in development
        hsts_enabled=False,  # No HSTS in development
        frame_options="SAMEORIGIN",
        referrer_policy="no-referrer-when-downgrade",
    )


def get_api_csp_directives() -> dict[str, str]:
    """
    Get CSP directives optimized for API-only responses.
    
    More restrictive since we don't serve HTML.
    """
    return {
        "default-src": "'none'",
        "frame-ancestors": "'none'",
        "form-action": "'none'",
        "base-uri": "'none'",
    }
