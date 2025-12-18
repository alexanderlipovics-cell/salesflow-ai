import hmac
import hashlib
import time
import logging
from ipaddress import ip_address, ip_network
from typing import Iterable
from fastapi import HTTPException, status, Request

logger = logging.getLogger(__name__)

FACEBOOK_SIGNATURE_HEADER = "X-Hub-Signature-256"
LINKEDIN_SIGNATURE_HEADER = "X-LI-Signature"
INSTAGRAM_SIGNATURE_HEADER = "X-Hub-Signature-256"

# Simple in-memory Rate Limit (pro Prozess).
_rate_limit_store: dict[str, list[float]] = {}

def _verify_hmac_signature(
    secret: str,
    payload: bytes,
    header_signature: str | None,
    prefix: str = "sha256",
) -> bool:
    if not header_signature:
        return False
    try:
        algo, signature = header_signature.split("=", 1)
    except ValueError:
        return False
    if algo.lower() != prefix.lower():
        return False
    expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def enforce_rate_limit(
    client_ip: str,
    key_prefix: str,
    max_requests_per_minute: int = 100,
) -> None:
    """
    Minimaler Schutz: max_requests_per_minute pro (IP + key_prefix).
    Für Produktion: durch Redis / API-Gateway ersetzen.
    """
    bucket_key = f"{key_prefix}:{client_ip}"
    now = time.time()
    window_start = now - 60
    history = _rate_limit_store.get(bucket_key, [])
    history = [ts for ts in history if ts >= window_start]
    if len(history) >= max_requests_per_minute:
        logger.warning("Rate limit exceeded for %s", bucket_key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )
    history.append(now)
    _rate_limit_store[bucket_key] = history

def enforce_ip_whitelist(
    client_ip: str,
    allowed_cidrs: Iterable[str] | None,
) -> None:
    """
    IP-Whitelist. Wenn allowed_cidrs leer/None sind → alle IPs erlaubt.
    """
    if not allowed_cidrs:
        return
    ip = ip_address(client_ip)
    for cidr in allowed_cidrs:
        try:
            network = ip_network(cidr)
        except ValueError:
            logger.error("Invalid CIDR in whitelist: %s", cidr)
            continue
        if ip in network:
            return
    logger.warning("IP %s not in whitelist", client_ip)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="IP not allowed",
    )

def verify_facebook_signature(
    raw_body: bytes,
    request: Request,
    app_secret: str,
) -> None:
    header_sig = request.headers.get(FACEBOOK_SIGNATURE_HEADER)
    if not _verify_hmac_signature(app_secret, raw_body, header_sig, prefix="sha256"):
        logger.warning("Invalid Facebook webhook signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Facebook signature",
        )

def verify_linkedin_signature(
    raw_body: bytes,
    request: Request,
    client_secret: str,
) -> None:
    header_sig = request.headers.get(LINKEDIN_SIGNATURE_HEADER)
    if not _verify_hmac_signature(client_secret, raw_body, header_sig, prefix="sha256"):
        logger.warning("Invalid LinkedIn webhook signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid LinkedIn signature",
        )

def verify_instagram_signature(
    raw_body: bytes,
    request: Request,
    app_secret: str,
) -> None:
    header_sig = request.headers.get(INSTAGRAM_SIGNATURE_HEADER)
    if not _verify_hmac_signature(app_secret, raw_body, header_sig, prefix="sha256"):
        logger.warning("Invalid Instagram webhook signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Instagram signature",
        )
