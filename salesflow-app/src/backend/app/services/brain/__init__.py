# backend/app/services/brain/__init__.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES BRAIN SERVICES                                                      ║
║  Self-Learning Rules Engine + Detection + Analysis                         ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from .service import SalesBrainService
from .detection_service import CorrectionDetectionService, CorrectionDetectionResult
from .analysis_service import CorrectionAnalysisService, AnalysisResult, SuggestedRule

__all__ = [
    "SalesBrainService",
    "CorrectionDetectionService",
    "CorrectionDetectionResult",
    "CorrectionAnalysisService",
    "AnalysisResult",
    "SuggestedRule",
]

