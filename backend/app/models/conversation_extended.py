# backend/app/models/conversation_extended.py

from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text, JSON, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.db.base_class import Base


class ChannelIdentity(Base):
    """
    Das Bindeglied für Omni-Channel Stitching.
    Verknüpft z.B. WhatsApp '+49170...' mit Lead ID 'uuid-123'.
    """
    __tablename__ = "channel_identities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False, index=True)
    
    channel_type = Column(String, nullable=False)  # whatsapp, linkedin, instagram, email
    identifier = Column(String, nullable=False, index=True)  # phone number, email, linkedin URN
    
    extra_metadata = Column(JSON, name="metadata", default={})  # Auth tokens, profile pic url
    last_active_at = Column(DateTime, default=datetime.utcnow)


class ConversationSummary(Base):
    """
    Warm Memory: Zusammenfassungen älterer Gespräche.
    """
    __tablename__ = "conversation_summaries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False, index=True)
    
    summary_text = Column(Text, nullable=False)
    key_facts = Column(JSON, default={})  # Extrahierte Fakten: { "budget": "high", "role": "CEO" }
    sentiment_snapshot = Column(Float)  # Durchschnittliches Sentiment dieses Zeitraums
    
    start_message_id = Column(UUID(as_uuid=True)) 
    end_message_id = Column(UUID(as_uuid=True))
    created_at = Column(DateTime, default=datetime.utcnow)

