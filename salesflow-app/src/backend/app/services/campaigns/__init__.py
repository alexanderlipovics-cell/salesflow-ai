"""
Campaign Service Package
"""

from .campaign_service import CampaignService
from .campaign_templates import CAMPAIGN_TEMPLATES, SEQUENCES

__all__ = ["CampaignService", "CAMPAIGN_TEMPLATES", "SEQUENCES"]

