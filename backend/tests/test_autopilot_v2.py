"""
Tests for Autopilot Engine V2

Run with: pytest tests/test_autopilot_v2.py -v
"""

from __future__ import annotations

import pytest
from datetime import datetime, time

from app.services.channels.whatsapp_adapter import WhatsAppAdapter
from app.services.channels.email_adapter import EmailAdapter
from app.services.confidence_gating import detect_opt_out, CONFIDENCE_THRESHOLD
from app.services.rate_limiter import check_rate_limit


# ============================================================================
# CHANNEL ADAPTER TESTS
# ============================================================================


def test_whatsapp_validate_recipient():
    """Test WhatsApp phone number validation"""
    adapter = WhatsAppAdapter(api_key="test", phone_number_id="123")
    
    # Valid E.164 numbers
    assert adapter.validate_recipient("+491234567890") is True
    assert adapter.validate_recipient("+14155551234") is True
    
    # Invalid numbers
    assert adapter.validate_recipient("123456") is False
    assert adapter.validate_recipient("no-plus") is False


def test_email_validate_recipient():
    """Test email address validation"""
    adapter = EmailAdapter(smtp_config={})
    
    # Valid emails
    assert adapter.validate_recipient("test@example.com") is True
    assert adapter.validate_recipient("user.name@company.co.uk") is True
    
    # Invalid emails
    assert adapter.validate_recipient("not-an-email") is False
    assert adapter.validate_recipient("@example.com") is False


def test_whatsapp_supports_features():
    """Test WhatsApp feature support"""
    adapter = WhatsAppAdapter(api_key="test", phone_number_id="123")
    
    assert adapter.supports_feature("read_receipts") is True
    assert adapter.supports_feature("emojis") is True
    assert adapter.supports_feature("html") is False


def test_email_supports_features():
    """Test email feature support"""
    adapter = EmailAdapter(smtp_config={})
    
    assert adapter.supports_feature("html") is True
    assert adapter.supports_feature("attachments") is True
    assert adapter.supports_feature("read_receipts") is False


# ============================================================================
# CONFIDENCE GATING TESTS
# ============================================================================


def test_confidence_threshold():
    """Test confidence threshold constant"""
    assert CONFIDENCE_THRESHOLD == 0.85
    assert 0.0 <= CONFIDENCE_THRESHOLD <= 1.0


def test_detect_opt_out():
    """Test opt-out detection"""
    # Positive cases
    assert detect_opt_out("stop") is True
    assert detect_opt_out("Bitte STOP") is True
    assert detect_opt_out("unsubscribe me") is True
    assert detect_opt_out("Kein Interesse mehr") is True
    assert detect_opt_out("lass mich in ruhe") is True
    
    # Negative cases
    assert detect_opt_out("I'm interested") is False
    assert detect_opt_out("Tell me more") is False


@pytest.mark.asyncio
async def test_check_content_safety():
    """Test content safety checks"""
    from app.services.confidence_gating import check_content_safety
    
    # Safe content
    safe_text = "Hallo! Danke für deine Nachricht."
    issues = await check_content_safety(safe_text)
    assert len(issues) == 0
    
    # Compliance risk
    risky_text = "Garantiert risikofrei und kostenlos!"
    issues = await check_content_safety(risky_text)
    assert any("compliance" in issue for issue in issues)


# ============================================================================
# SCHEDULING TESTS
# ============================================================================


def test_channel_default_hours():
    """Test channel default send hours"""
    from app.services.scheduler import _get_channel_default_hour
    
    assert _get_channel_default_hour("email") == 10  # 10 AM
    assert _get_channel_default_hour("whatsapp") == 14  # 2 PM
    assert _get_channel_default_hour("linkedin") == 9  # 9 AM
    assert _get_channel_default_hour("instagram") == 18  # 6 PM
    assert _get_channel_default_hour("unknown") == 12  # Fallback


# ============================================================================
# INTEGRATION TESTS (require test database)
# ============================================================================


@pytest.mark.integration
async def test_full_autopilot_flow():
    """
    Test complete autopilot flow:
    1. Create message event
    2. Process with engine
    3. Check job creation
    4. Execute job
    5. Verify send
    
    Requires: Test database setup
    """
    pass


@pytest.mark.integration
async def test_rate_limiting():
    """Test rate limiting prevents spam"""
    pass


@pytest.mark.integration
async def test_confidence_gating():
    """Test low confidence messages go to review queue"""
    pass


@pytest.mark.integration
async def test_opt_out_handling():
    """Test opt-out cancels future messages"""
    pass


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

