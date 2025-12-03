# ============================================================================
# FILE: app/models/ocr.py
# DESCRIPTION: OCR & Screenshot Import Models
# ============================================================================

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class OcrResult(Base):
    """
    Stores OCR results for audit and debugging
    Part of SCREENSHOT-REACTIVATOR module
    """
    __tablename__ = "ocr_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_url = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=False)
    leads_created = Column(Integer, default=0)
    processing_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    # user = relationship("User", back_populates="ocr_results")

    def __repr__(self):
        return f"<OcrResult(id={self.id}, leads={self.leads_created})>"

