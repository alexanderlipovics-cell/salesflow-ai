# ============================================================================
# FILE: app/models/compliance.py
# DESCRIPTION: Compliance & Legal Protection Models
# ============================================================================

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class ComplianceLog(Base):
    """
    Tracks compliance issues and actions taken
    Part of LIABILITY-SHIELD module
    """
    __tablename__ = "compliance_logs"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    issue_type = Column(String(100), nullable=False)
    action_taken = Column(Text, nullable=False)
    original_text = Column(Text, nullable=True)
    filtered_text = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship (if messages table exists)
    # message = relationship("Message", back_populates="compliance_logs")

    def __repr__(self):
        return f"<ComplianceLog(id={self.id}, type={self.issue_type})>"

