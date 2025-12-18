# backend/app/models/email_campaign.py

from datetime import datetime
from sqlalchemy import JSON, Column, DateTime, Integer, String, Text, Boolean

from app.db.base_class import Base

class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    template = Column(String(64), nullable=False)
    status = Column(String(16), default="draft")  # draft, scheduled, sending, completed
    audience_size = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

class EmailSend(Base):
    __tablename__ = "email_sends"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    campaign = Column(String(64), nullable=False, index=True)
    template = Column(String(64), nullable=False)
    message_id = Column(String(128), nullable=False)
    subject = Column(String(256), nullable=False)
    status = Column(String(16), default="sent")  # sent, delivered, opened, clicked, bounced
    sent_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    clicked_at = Column(DateTime(timezone=True), nullable=True)
    unsubscribed = Column(Boolean, default=False)
